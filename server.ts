import express from "express";
import path from "path";
import * as nodeCrypto from "crypto";
import { createServer as createViteServer } from "vite";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON bodies
  app.use(express.json());

  // Interface representing the GamePix JSON Feed item structure
  interface GameItem {
    id: string;
    title: string;
    namespace: string;
    description: string;
    category: string;
    orientation: string;
    quality_score: number;
    width: number;
    height: number;
    banner_image: string;
    image: string;
    url: string;
  }

  // Interface representing Payout/Withdrawal requests
  interface WithdrawalRequest {
    id: string;
    phone: string;
    amount: number;
    walletType: string;
    status: "Pending" | "Disetujui" | "Ditolak";
    timestamp: string;
  }

  // Database of withdrawals stored in server memory (with initial mock templates for demonstration)
  let withdrawals: WithdrawalRequest[] = [
    {
      id: "wd-241512",
      phone: "081287654312",
      amount: 50000,
      walletType: "DANA E-Wallet",
      status: "Pending",
      timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString() // 3 mins ago
    },
    {
      id: "wd-982144",
      phone: "085712349089",
      amount: 100000,
      walletType: "OVO Wallet",
      status: "Disetujui",
      timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString() // 4 hours ago
    },
    {
      id: "wd-154902",
      phone: "081987541235",
      amount: 50000,
      walletType: "GoPay Wallet",
      status: "Ditolak",
      timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString() // 1 day ago
    }
  ];

  let cachedGames: GameItem[] = [];
  let lastFetched = 0;
  const CACHE_TTL = 30 * 60 * 1000; // 30 minutes cache timeout

  // Active Dana Kaget Link state store
  let activeDanaKaget = {
    link: "",
    updatedAt: ""
  };

  // Persistent 2FA state config
  const CONFIG_FILE = "./admin-2fa-config.json";
  let admin2FA = {
    isEnabled: false,
    secret: "PUSA TGAM E2FA SECE RET", // default safe Base32 key
  };

  if (fs.existsSync(CONFIG_FILE)) {
    try {
      admin2FA = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
      console.log(`[2FA CONFIG]: Loaded state. Mode enabled: ${admin2FA.isEnabled}`);
    } catch (e) {
      console.warn("Gagal membaca file konfigurasi 2FA, menggunakan default.");
    }
  }

  function save2FAConfig() {
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(admin2FA, null, 2));
    } catch (e) {
      console.error("Gagal menyimpan file konfigurasi 2FA:", e);
    }
  }

  // Base32 Decoder mapping ABCDEFGHIJKLMNOPQRSTUVWXYZ234567
  function base32Decode(base32String: string): Buffer {
    const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const cleanString = base32String.replace(/\s+/g, "").toUpperCase().replace(/ =+$/, "");
    let len = cleanString.length;
    let bits = 0;
    let val = 0;
    const bytes = [];

    for (let i = 0; i < len; i++) {
      const valChar = base32chars.indexOf(cleanString[i]);
      if (valChar === -1) {
        throw new Error("Invalid character in base32 secret");
      }
      val = (val << 5) | valChar;
      bits += 5;
      if (bits >= 8) {
        bytes.push((val >> (bits - 8)) & 255);
        bits -= 8;
      }
    }
    return Buffer.from(bytes);
  }

  // Pure cryptographic TOTP verifier (matches Google/Microsoft Authenticator)
  function verifyTOTP(secretBase32: string, token: string, windowParts: number = 2): boolean {
    const cleanSecret = secretBase32.replace(/\s+/g, "").toUpperCase();
    const cleanToken = token.trim();
    if (cleanToken.length !== 6 || isNaN(Number(cleanToken))) return false;
    
    const epoch = Math.floor(Date.now() / 1000);
    const timeStepSeconds = 30; // 30-sec intervals
    
    // Check key skew within selected window width
    for (let i = -windowParts; i <= windowParts; i++) {
      const counterValue = Math.floor(epoch / timeStepSeconds) + i;
      const buffer = Buffer.alloc(8);
      let temp = counterValue;
      for (let j = 7; j >= 0; j--) {
        buffer.writeUInt8(temp & 255, j);
        temp = Math.floor(temp / 256);
      }
      
      try {
        const key = base32Decode(cleanSecret);
        const hmac = nodeCrypto.createHmac("sha1", key);
        hmac.update(buffer);
        const hmacResult = hmac.digest();
        
        const offset = hmacResult[hmacResult.length - 1] & 15;
        const binary = ((hmacResult[offset] & 127) << 24) |
                       ((hmacResult[offset + 1] & 255) << 16) |
                       ((hmacResult[offset + 2] & 255) << 8) |
                       (hmacResult[offset + 3] & 255);
                       
        const otp = binary % 1000000;
        const calculatedToken = otp.toString().padStart(6, "0");
        if (calculatedToken === cleanToken) {
          return true;
        }
      } catch (err) {
        continue;
      }
    }
    return false;
  }

  // Caches prefilled items on startup and keeps it updated
  async function refreshCache() {
    try {
      console.log("Refreshing game cache...");
      const pages = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const requests = pages.map(p =>
        fetch(`https://feeds.gamepix.com/v2/json?sid=5O352&pagination=12&page=${p}`)
          .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
          })
          .catch(e => {
            console.error(`Failed to fetch GamePix page ${p}:`, e.message);
            return { items: [] };
          })
      );

      const results = await Promise.all(requests);
      const allItems: GameItem[] = [];
      const seenIds = new Set<string>();

      for (const res of results) {
        if (res && Array.isArray(res.items)) {
          for (const item of res.items) {
            if (item && item.id && !seenIds.has(item.id)) {
              seenIds.add(item.id);
              // Clean up image sizes for premium crisp quality standard
              if (item.banner_image && item.banner_image.includes("?w=")) {
                item.banner_image = item.banner_image.split("?w=")[0] + "?w=450";
              }
              if (item.image && item.image.includes("?w=")) {
                item.image = item.image.split("?w=")[0] + "?w=200";
              }
              allItems.push(item);
            }
          }
        }
      }

      if (allItems.length > 0) {
        cachedGames = allItems;
        lastFetched = Date.now();
        console.log(`Cache updated successfully with ${cachedGames.length} high-quality games!`);
      }
    } catch (err) {
      console.error("Error updating game cache:", err);
    }
  }

  // Preload on startup
  refreshCache();

  // API router
  app.get("/api/games", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string || "1", 10);
      const pagination = parseInt(req.query.pagination as string || "12", 10);
      const category = (req.query.category as string || "all").toLowerCase();
      const search = (req.query.search as string || "").toLowerCase();

      // Refresh in background if TTL expired
      if (Date.now() - lastFetched > CACHE_TTL) {
        refreshCache();
      }

      // Lock fetch if first-load Cache is completely empty
      if (cachedGames.length === 0) {
        await refreshCache();
      }

      let filtered = [...cachedGames];

      // Safe fallback if caching failed or API was completely down
      if (filtered.length === 0) {
        try {
          const directRes = await fetch(`https://feeds.gamepix.com/v2/json?sid=5O352&pagination=${pagination}&page=${page}`);
          if (directRes.ok) {
            const data = await directRes.json();
            return res.json({
              items: data.items || [],
              page: page,
              pagination: pagination,
              total: (data.items || []).length,
              hasMore: false
            });
          }
        } catch (e) {
          console.error("Direct fallback fetch failed:", e);
        }
      }

      // Category matching filter mapping to clean UI groups
      if (category && category !== "all") {
        filtered = filtered.filter(item => {
          const itemCat = (item.category || "").toLowerCase();
          
          if (category === "board") {
            return ["board", "strategy", "chess", "cards", "table", "ludo", "dice"].includes(itemCat) || 
                   itemCat.includes("board") || itemCat.includes("strategy") || itemCat.includes("table");
          }
          if (category === "arcade") {
            return ["arcade", "runner", "racing", "car", "retro", "physics", "platformer", "jump", "gravity"].includes(itemCat) || 
                   itemCat.includes("arcade") || itemCat.includes("race") || itemCat.includes("car") || itemCat.includes("run");
          }
          if (category === "puzzle") {
            return ["puzzle", "match-3", "2048", "memory", "block", "drawing", "kids", "educational", "logic", "matching"].includes(itemCat) || 
                   itemCat.includes("puzzle") || itemCat.includes("match");
          }
          if (category === "action") {
            return ["action", "battle", "fighting", "shooter", "first-person-shooter", "stickman", "robots", "sniper", "shooting"].includes(itemCat) || 
                   itemCat.includes("action") || itemCat.includes("shoot") || itemCat.includes("fight");
          }
          if (category === "quiz") {
            return ["quiz", "trivia", "educational", "words", "word", "brain"].includes(itemCat) || 
                   itemCat.includes("quiz") || itemCat.includes("trivia") || itemCat.includes("word");
          }
          if (category === "sports") {
            return ["sports", "basketball", "ball", "billiard", "golf", "football", "soccer"].includes(itemCat) || 
                   itemCat.includes("sport") || itemCat.includes("ball") || itemCat.includes("pool");
          }
          
          return itemCat === category || itemCat.includes(category);
        });
      }

      // Search matching filter
      if (search) {
        filtered = filtered.filter(item => {
          const title = (item.title || "").toLowerCase();
          const desc = (item.description || "").toLowerCase();
          const cat = (item.category || "").toLowerCase();
          return title.includes(search) || desc.includes(search) || cat.includes(search);
        });
      }

      // Calculate safe pagination indices
      const startIndex = (page - 1) * pagination;
      const paginatedItems = filtered.slice(startIndex, startIndex + pagination);

      return res.json({
        items: paginatedItems,
        page: page,
        pagination: pagination,
        total: filtered.length,
        hasMore: startIndex + pagination < filtered.length
      });
    } catch (error) {
      console.error("Error serving games endpoint:", error);
      res.status(500).json({ error: "Failed to load games from channel" });
    }
  });

  // Endpoints for Payout & Withdrawals Management
  app.post("/api/withdraw", (req, res) => {
    try {
      const { phone, amount, walletType } = req.body;
      if (!phone || typeof amount !== "number" || amount <= 0 || !walletType) {
        return res.status(400).json({ error: "Data penarikan tidak valid atau tidak lengkap." });
      }

      const newId = "wd-" + Math.floor(100000 + Math.random() * 900000);
      const newWd: WithdrawalRequest = {
        id: newId,
        phone: String(phone),
        amount: Number(amount),
        walletType: String(walletType),
        status: "Pending",
        timestamp: new Date().toISOString()
      };

      withdrawals.unshift(newWd); // Prepend to show most recent requests first
      console.log(`[Pencairan BaruDiterima]: ${newWd.phone} senilai Rp ${newWd.amount} via ${newWd.walletType}`);
      
      return res.json({ success: true, withdrawal: newWd });
    } catch (err: any) {
      console.error("Error creating withdrawal:", err);
      return res.status(500).json({ error: "Gagal memproses penarikan saldo." });
    }
  });

  app.get("/api/admin/withdrawals", (req, res) => {
    try {
      const passcode = req.query.passcode as string;
      if (passcode !== "admin123") {
        return res.status(401).json({ error: "Akses Ditolak! Kode sandi salah." });
      }

      if (admin2FA.isEnabled) {
        const token = (req.query.twoFactorToken as string) || (req.headers["x-two-factor-token"] as string);
        if (!token) {
          return res.status(403).json({ error: "2FA_REQUIRED", message: "Masukkan 6-digit kode 2FA untuk masuk." });
        }
        if (!verifyTOTP(admin2FA.secret, token)) {
          return res.status(403).json({ error: "2FA_INVALID", message: "Kode 2FA salah atau kadaluwarsa. Silakan coba lagi." });
        }
      }

      return res.json({ withdrawals, twoFactorEnabled: admin2FA.isEnabled });
    } catch (err) {
      return res.status(500).json({ error: "Gagal mengambil data penarikan." });
    }
  });

  app.post("/api/admin/withdrawals/:id", (req, res) => {
    try {
      const { passcode, status, twoFactorToken } = req.body;
      if (passcode !== "admin123") {
        return res.status(401).json({ error: "Akses Ditolak! Kode sandi admin salah." });
      }

      if (admin2FA.isEnabled) {
        const token = twoFactorToken || (req.headers["x-two-factor-token"] as string);
        if (!token) {
          return res.status(403).json({ error: "2FA_REQUIRED" });
        }
        if (!verifyTOTP(admin2FA.secret, token)) {
          return res.status(403).json({ error: "2FA_INVALID" });
        }
      }

      const { id } = req.params;
      const foundIdx = withdrawals.findIndex(w => w.id === id);
      if (foundIdx === -1) {
        return res.status(404).json({ error: "Transaksi tidak ditemukan." });
      }

      if (status === "Disetujui" || status === "Ditolak" || status === "Pending") {
        withdrawals[foundIdx].status = status;
        console.log(`[Status Transaksi Diubah] ID: ${id} -> ${status}`);
        return res.json({ success: true, withdrawal: withdrawals[foundIdx] });
      } else {
        return res.status(400).json({ error: "Status penarikan tidak valid." });
      }
    } catch (err) {
      return res.status(500).json({ error: "Gagal mengubah status transaksi." });
    }
  });

  // Dana Kaget dynamic link distribution endpoints
  app.get("/api/dana-kaget", (req, res) => {
    return res.json(activeDanaKaget);
  });

  app.post("/api/admin/dana-kaget", (req, res) => {
    try {
      const { passcode, link, twoFactorToken } = req.body;
      if (passcode !== "admin123") {
        return res.status(401).json({ error: "Akses Ditolak! Kode sandi admin salah." });
      }

      if (admin2FA.isEnabled) {
        const token = twoFactorToken || (req.headers["x-two-factor-token"] as string);
        if (!token) {
          return res.status(403).json({ error: "2FA_REQUIRED" });
        }
        if (!verifyTOTP(admin2FA.secret, token)) {
          return res.status(403).json({ error: "2FA_INVALID" });
        }
      }

      activeDanaKaget = {
        link: String(link || "").trim(),
        updatedAt: link ? new Date().toISOString() : ""
      };

      console.log(`[DANA KAGET UPDATE]: Admin updated link to "${activeDanaKaget.link}"`);
      return res.json({ success: true, activeDanaKaget });
    } catch (err) {
      return res.status(500).json({ error: "Gagal memperbarui info Dana Kaget." });
    }
  });

  // Endpoints for Admin 2FA Management
  app.get("/api/admin/2fa", (req, res) => {
    try {
      const passcode = req.query.passcode as string;
      if (passcode !== "admin123") {
        return res.status(401).json({ error: "Akses Ditolak!" });
      }
      return res.json({
        isEnabled: admin2FA.isEnabled,
        secret: admin2FA.secret
      });
    } catch (e) {
      return res.status(500).json({ error: "Gagal mengambil konfigurasi 2FA." });
    }
  });

  app.get("/api/admin/2fa/generate", (req, res) => {
    try {
      const passcode = req.query.passcode as string;
      if (passcode !== "admin123") {
        return res.status(401).json({ error: "Akses Ditolak!" });
      }
      
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
      let randomSecret = "";
      for (let i = 0; i < 16; i++) {
        randomSecret += chars[Math.floor(Math.random() * chars.length)];
      }

      return res.json({ secret: randomSecret });
    } catch (e) {
      return res.status(500).json({ error: "Gagal menghasilkan kunci rahasia 2FA." });
    }
  });

  app.post("/api/admin/2fa/toggle", (req, res) => {
    try {
      const { passcode, token, enable, secret } = req.body;
      if (passcode !== "admin123") {
        return res.status(401).json({ error: "Akses Ditolak!" });
      }

      if (!token) {
        return res.status(400).json({ error: "Token verifikasi 2FA diperlukan!" });
      }

      if (enable) {
        const secretToTest = secret || admin2FA.secret;
        if (!verifyTOTP(secretToTest, token)) {
          return res.status(400).json({ error: "Token 2FA tidak valid atau salah!" });
        }
        admin2FA.secret = secretToTest;
        admin2FA.isEnabled = true;
        save2FAConfig();
        return res.json({ success: true, message: "2FA Berhasil diaktifkan!", isEnabled: true });
      } else {
        if (!verifyTOTP(admin2FA.secret, token)) {
          return res.status(400).json({ error: "Token 2FA tidak valid atau salah!" });
        }
        admin2FA.isEnabled = false;
        save2FAConfig();
        return res.json({ success: true, message: "2FA Berhasil dinonaktifkan!", isEnabled: false });
      }
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Gagal memproses permintaan 2FA." });
    }
  });

  // Hot module replacement support in dev, static assets in prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Pusat Game backend running on port ${PORT}`);
  });
}

startServer();
