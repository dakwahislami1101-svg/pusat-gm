import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON bodies
  app.use(express.json());

  // Middleware to allow CORS for Capacitor/Android client origins
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    
    // Quick handle for preflight OPTIONS requests
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

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

  // Database of withdrawals stored in server memory (only real active requests)
  let withdrawals: WithdrawalRequest[] = [];

  let cachedGames: GameItem[] = [];
  let lastFetched = 0;
  const CACHE_TTL = 30 * 60 * 1000; // 30 minutes cache timeout

  // Active Dana Kaget Link state store
  let activeDanaKaget = {
    link: "",
    updatedAt: ""
  };

  // Dynamic Admin passcode setting
  let adminPasscode = "admin123";

  // Get active GamePix SID
  function getGamepixSid(): string {
    try {
      const sidPath = path.join(process.cwd(), "public", "gamepix_sid.txt");
      if (fs.existsSync(sidPath)) {
        return fs.readFileSync(sidPath, "utf8").trim() || "5O352";
      }
    } catch (e) {
      console.error("Gagal membaca gamepix_sid.txt:", e);
    }
    return "5O352";
  }

  // Set active GamePix SID
  function setGamepixSid(sid: string) {
    try {
      const publicPath = path.join(process.cwd(), "public");
      if (!fs.existsSync(publicPath)) {
        fs.mkdirSync(publicPath, { recursive: true });
      }
      fs.writeFileSync(path.join(publicPath, "gamepix_sid.txt"), sid.trim(), "utf8");
    } catch (e) {
      console.error("Gagal menulis gamepix_sid.txt:", e);
    }
  }

  // Caches prefilled items on startup and keeps it updated
  async function refreshCache() {
    try {
      console.log("Refreshing game cache...");
      const pages = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const requests = pages.map(p =>
        fetch(`https://feeds.gamepix.com/v2/json?sid=${getGamepixSid()}&pagination=12&page=${p}`)
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
          const directRes = await fetch(`https://feeds.gamepix.com/v2/json?sid=${getGamepixSid()}&pagination=${pagination}&page=${page}`);
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
      if (passcode !== adminPasscode) {
        return res.status(401).json({ error: "Akses Ditolak! Kode sandi salah." });
      }
      return res.json({ withdrawals });
    } catch (err) {
      return res.status(500).json({ error: "Gagal mengambil data penarikan." });
    }
  });

  app.post("/api/admin/withdrawals/:id", (req, res) => {
    try {
      const { passcode, status } = req.body;
      if (passcode !== adminPasscode) {
        return res.status(401).json({ error: "Akses Ditolak! Kode sandi salah." });
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

  // Change Admin passcode endpoint
  app.post("/api/admin/change-password", (req, res) => {
    try {
      const { passcode, newPasscode } = req.body;
      if (passcode !== adminPasscode) {
        return res.status(401).json({ error: "Kode sandi saat ini salah!" });
      }
      const cleanNew = String(newPasscode || "").trim();
      if (!cleanNew || cleanNew.length < 4) {
        return res.status(400).json({ error: "Sandi baru minimal harus 4 karakter!" });
      }
      adminPasscode = cleanNew;
      console.log(`[PASSCODE CHANGED] Secure passcode updated.`);
      return res.json({ success: true, message: "Kata sandi berhasil diperbarui!" });
    } catch (err) {
      return res.status(500).json({ error: "Gagal mengganti kata sandi." });
    }
  });

  // Dana Kaget dynamic link distribution endpoints
  app.get("/api/dana-kaget", (req, res) => {
    return res.json(activeDanaKaget);
  });

  app.post("/api/admin/dana-kaget", (req, res) => {
    try {
      const { passcode, link } = req.body;
      if (passcode !== adminPasscode) {
        return res.status(401).json({ error: "Akses Ditolak! Kode sandi salah." });
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

  // Serve ads.txt dynamically at root /ads.txt
  app.get("/ads.txt", (req, res) => {
    try {
      const adsPath = path.join(process.cwd(), "public", "ads.txt");
      if (fs.existsSync(adsPath)) {
        res.setHeader("Content-Type", "text/plain");
        return res.send(fs.readFileSync(adsPath, "utf8"));
      }
      const distAdsPath = path.join(process.cwd(), "dist", "ads.txt");
      if (fs.existsSync(distAdsPath)) {
        res.setHeader("Content-Type", "text/plain");
        return res.send(fs.readFileSync(distAdsPath, "utf8"));
      }
      res.setHeader("Content-Type", "text/plain");
      return res.send("# Ads.txt - Silakan masukkan konfigurasi ads.txt di Panel Admin");
    } catch (err: any) {
      res.setHeader("Content-Type", "text/plain");
      return res.status(500).send("# Gagal membaca file ads.txt: " + err.message);
    }
  });

  // API to get ads.txt for Admin panel
  app.get("/api/admin/ads", (req, res) => {
    try {
      const passcode = req.query.passcode as string;
      if (passcode !== adminPasscode) {
        return res.status(401).json({ error: "Akses Ditolak!" });
      }

      const adsPath = path.join(process.cwd(), "public", "ads.txt");
      let content = "";
      if (fs.existsSync(adsPath)) {
        content = fs.readFileSync(adsPath, "utf8");
      } else {
        const distAdsPath = path.join(process.cwd(), "dist", "ads.txt");
        if (fs.existsSync(distAdsPath)) {
          content = fs.readFileSync(distAdsPath, "utf8");
        }
      }
      return res.json({ content });
    } catch (err: any) {
      return res.status(500).json({ error: "Gagal mendapatkan ads.txt: " + err.message });
    }
  });

  // API to save ads.txt from Admin panel
  app.post("/api/admin/ads", (req, res) => {
    try {
      const { passcode, content } = req.body;
      if (passcode !== adminPasscode) {
        return res.status(401).json({ error: "Akses Ditolak!" });
      }
      
      const publicPath = path.join(process.cwd(), "public");
      if (!fs.existsSync(publicPath)) {
        fs.mkdirSync(publicPath, { recursive: true });
      }
      const adsPath = path.join(publicPath, "ads.txt");
      fs.writeFileSync(adsPath, content || "", "utf8");

      // Also write directly to dist/ads.txt if in production so it reflects immediately
      const distPath = path.join(process.cwd(), "dist");
      if (fs.existsSync(distPath)) {
        fs.writeFileSync(path.join(distPath, "ads.txt"), content || "", "utf8");
      }

      console.log("[ADS.TXT UPDATED] ads.txt saved successfully!");
      return res.json({ success: true, message: "ads.txt berhasil diperbarui!" });
    } catch (err: any) {
      return res.status(500).json({ error: "Gagal menyimpan ads.txt: " + err.message });
    }
  });

  // API to get current GamePix SID
  app.get("/api/admin/gamepix-sid", (req, res) => {
    try {
      const passcode = req.query.passcode as string;
      if (passcode !== adminPasscode) {
        return res.status(401).json({ error: "Akses Ditolak!" });
      }
      return res.json({ sid: getGamepixSid() });
    } catch (err: any) {
      return res.status(500).json({ error: "Gagal mendapatkan SID: " + err.message });
    }
  });

  // API to update GamePix SID
  app.post("/api/admin/gamepix-sid", (req, res) => {
    try {
      const { passcode, sid } = req.body;
      if (passcode !== adminPasscode) {
        return res.status(401).json({ error: "Akses Ditolak!" });
      }
      if (!sid || !sid.trim()) {
        return res.status(400).json({ error: "SID tidak boleh kosong!" });
      }
      
      setGamepixSid(sid.trim());
      
      // Force refresh the cache so the games from the new SID are preloaded
      cachedGames = [];
      lastFetched = 0;
      refreshCache();
      
      console.log(`[GAMEPIX SID UPDATED] GamePix SID has been updated to: ${sid.trim()}`);
      return res.json({ success: true, message: "GamePix SID berhasil diperbarui!" });
    } catch (err: any) {
      return res.status(500).json({ error: "Gagal menyimpan SID: " + err.message });
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
