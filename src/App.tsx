import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Search, 
  SlidersHorizontal, 
  Star, 
  Play, 
  X, 
  RotateCcw, 
  Gamepad2, 
  ArrowLeft, 
  Heart, 
  Loader2, 
  Coins, 
  Share2, 
  Maximize2, 
  TrendingUp, 
  Trophy, 
  Gift,
  Bell 
} from "lucide-react";
import { Game } from "./types";

export default function App() {
  // Game & filtering states
  const [games, setGames] = useState<Game[]>([]);
  const [page, setPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Focus & active gameplay
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [playingGame, setPlayingGame] = useState<Game | null>(null);

  // Persistence layers (Favorites & DANA Rewards)
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem("pusat_game_favs");
    return saved ? JSON.parse(saved) : [];
  });
  
  const [danaBalance, setDanaBalance] = useState<number>(() => {
    const saved = localStorage.getItem("pusat_game_dana");
    return saved ? parseInt(saved, 10) : 5500000; // Mulai dengan 5.500.000 Koin (Setara Rp 55.000 untuk pengujian instan)
  });

  const [gamesPlayedCount, setGamesPlayedCount] = useState<number>(() => {
    const saved = localStorage.getItem("pusat_game_played_count");
    return saved ? parseInt(saved, 10) : 0;
  });

  // Modal / Interaction triggers
  const [showLuckyWheel, setShowLuckyWheel] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelDegree, setWheelDegree] = useState(0);
  const [showClaimSuccess, setShowClaimSuccess] = useState(false);
  const [claimAmount, setClaimAmount] = useState(0);
  const [withdrawalPhone, setWithdrawalPhone] = useState("");
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawalSuccess, setWithdrawalSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Real e-wallet withdrawal and admin control panel states
  const [withdrawalWallet, setWithdrawalWallet] = useState("DANA E-Wallet");
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminPasscode, setAdminPasscode] = useState("");
  const [newAdminPasscode, setNewAdminPasscode] = useState("");
  const [showPasswordChangeGroup, setShowPasswordChangeGroup] = useState(false);
  const [adminWithdrawals, setAdminWithdrawals] = useState<any[]>([]);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);

  // Dana Kaget Share states
  const [danaKagetLink, setDanaKagetLink] = useState("");
  const [danaKagetTime, setDanaKagetTime] = useState("");
  const [adminDanaKagetInput, setAdminDanaKagetInput] = useState("");

  // Dynamic Reward Settings (Adjustable by Admin)
  const [rewardMin, setRewardMin] = useState<number>(() => {
    const saved = localStorage.getItem("pusat_game_reward_min");
    return saved ? parseInt(saved, 10) : 5000; // Default 5.000 Koin
  });

  const [rewardMax, setRewardMax] = useState<number>(() => {
    const saved = localStorage.getItem("pusat_game_reward_max");
    return saved ? parseInt(saved, 10) : 25000; // Default 25.000 Koin
  });

  const [wheelRewards, setWheelRewards] = useState<number[]>(() => {
    const saved = localStorage.getItem("pusat_game_wheel_rewards");
    return saved ? JSON.parse(saved) : [120000, 25000, 80000, 15000, 50000, 30000, 100000, 10000]; // Koin values for Lucky Wheel
  });

  // Unity Ads integration states
  const [unityAdsGameId, setUnityAdsGameId] = useState<string>(() => {
    return localStorage.getItem("unity_ads_game_id") || "6140067"; // User's customized Game ID
  });

  const [apiHost, setApiHost] = useState<string>(() => {
    return localStorage.getItem("pusat_game_api_host") || "https://ais-pre-5lqjbcyrtgpq3bexvnmoaj-141461824786.asia-east1.run.app";
  });

  const getApiUrl = (path: string) => {
    // Is this running inside Capacitor (Android/iOS) or standalone local index.html?
    const isMobileClient = 
      !!(window as any).Capacitor ||
      window.location.origin.includes("capacitor://") || 
      window.location.protocol === "file:" ||
      (window.location.hostname === "localhost" && !["3000", "5173", "8080", "3001"].includes(window.location.port)) ||
      (window.location.hostname === "127.0.0.1" && !["3000", "5173", "8080", "3001"].includes(window.location.port)) ||
      // Any standard webview local content on Android
      window.location.origin.startsWith("http://localhost") || 
      window.location.origin.startsWith("https://localhost");

    if (isMobileClient) {
      return `${apiHost.replace(/\/$/, "")}${path}`;
    }
    return path;
  };
  const [unityRewardedAdUnit, setUnityRewardedAdUnit] = useState<string>(() => {
    return localStorage.getItem("unity_rewarded_ad_unit") || "Rewarded_Android";
  });
  const [rewardedCoinsPerAd, setRewardedCoinsPerAd] = useState<number>(() => {
    const saved = localStorage.getItem("unity_rewarded_coins");
    return saved ? parseInt(saved, 10) : 150000; // Default reward payload: +150,000 Coins!
  });
  const [showUnityAdPlayer, setShowUnityAdPlayer] = useState(false);
  const [isAdLoading, setIsAdLoading] = useState(false);
  const [adSecondsLeft, setAdSecondsLeft] = useState(0);
  const [isAdSoundMuted, setIsAdSoundMuted] = useState(false);
  const [activeAdTopic, setActiveAdTopic] = useState<number>(0); // supports multiple funny simulated trailers


  const [wheelInput, setWheelInput] = useState<string>(() => {
    const saved = localStorage.getItem("pusat_game_wheel_rewards");
    const arr = saved ? JSON.parse(saved) : [120000, 25000, 80000, 15000, 50000, 30000, 100000, 10000];
    return arr.join(", ");
  });

  // Active player bonus states
  const [secsRemaining, setSecsRemaining] = useState<number>(() => {
    const saved = localStorage.getItem("pusat_game_secs_remaining");
    return saved ? parseInt(saved, 10) : 300; // 5 minutes
  });
  const [showActiveBonusToast, setShowActiveBonusToast] = useState(false);
  const lastInteractionTime = useRef<number>(Date.now());
  const [isPlayerActive, setIsPlayerActive] = useState(true);

  // Floating Mobile/Web Notification system
  interface AppNotification {
    id: string;
    title: string;
    message: string;
    icon: string;
    category: "coin" | "danakaget";
  }
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const prevDanaKagetLink = useRef<string>("");
  const isFirstLoad = useRef<boolean>(true);

  // Reusable notification SDK trigger
  const showNotification = (title: string, message: string, icon: string, category: "coin" | "danakaget") => {
    // 1. Synthesize audio alert chime (dual tone frequency alert)
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      osc.start();
      
      setTimeout(() => {
        osc.frequency.setValueAtTime(1050, audioCtx.currentTime);
        setTimeout(() => {
          osc.stop();
          audioCtx.close();
        }, 150);
      }, 100);
    } catch (e) {
      console.warn("Audio Context alert blocked/unsupported:", e);
    }

    // 2. Play Haptic feedback vibration (for mobile browsers supporting Web Vibration API)
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate([100, 50, 100]);
      } catch (err) {
        // Safe to ignore if blocked
      }
    }

    // 3. Native Device OS notification trigger
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, {
          body: message,
          icon: "/favicon.ico"
        });
      } catch (e) {
        console.warn("Native Notification exception:", e);
      }
    }

    // 4. In-App beautiful iOS/Android floating drop-down banner
    const id = Date.now().toString() + Math.random().toFixed(4);
    const newNotif = { id, title, message, icon, category };
    setNotifications((prev) => [...prev, newNotif]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((item) => item.id !== id));
    }, 6000); // dismiss after 6 seconds
  };

  // Lucky Wheel Cooldown states
  const [lastWheelSpin, setLastWheelSpin] = useState<number>(() => {
    const saved = localStorage.getItem("pusat_game_last_wheel_spin");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [wheelCooldownSecs, setWheelCooldownSecs] = useState<number>(0);

  useEffect(() => {
    const checkCooldown = () => {
      const timeSinceLastSpin = Date.now() - lastWheelSpin;
      const rem = Math.max(0, Math.ceil((600000 - timeSinceLastSpin) / 1000));
      setWheelCooldownSecs(rem);
    };

    checkCooldown();
    const timer = setInterval(checkCooldown, 1000);
    return () => clearInterval(timer);
  }, [lastWheelSpin]);

  // Track user activity to define "pemain aktif" (active player)
  useEffect(() => {
    const updateActivity = () => {
      lastInteractionTime.current = Date.now();
      setIsPlayerActive(true);
    };

    window.addEventListener("mousemove", updateActivity);
    window.addEventListener("keydown", updateActivity);
    window.addEventListener("click", updateActivity);
    window.addEventListener("scroll", updateActivity);
    window.addEventListener("touchstart", updateActivity);

    return () => {
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keydown", updateActivity);
      window.removeEventListener("click", updateActivity);
      window.removeEventListener("scroll", updateActivity);
      window.removeEventListener("touchstart", updateActivity);
    };
  }, []);

  // Tick countdown timer for active player
  useEffect(() => {
    const interval = setInterval(() => {
      // Deem active if interacted within last 45 seconds or currently playing a game
      const isCurrentlyActive = (Date.now() - lastInteractionTime.current < 45000) || !!playingGame;
      setIsPlayerActive(isCurrentlyActive);

      // Only tick if browser is visible and player is active
      if (!document.hidden && isCurrentlyActive) {
        setSecsRemaining((prev) => {
          const nextSecs = prev - 1;
          if (nextSecs <= 0) {
            // Reward 500 Coins
            setDanaBalance((curr) => curr + 500);
            showNotification(
              "🎁 Bonus Bermain Aktif!",
              "Selamat! Anda mendapatkan +500 Koin gratis karena tetap aktif di dalam game!",
              "💰",
              "coin"
            );
            setShowActiveBonusToast(true);
            setTimeout(() => {
              setShowActiveBonusToast(false);
            }, 5000);
            return 300; // Reset
          }
          return nextSecs;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [playingGame]);

  // Persist seconds remaining
  useEffect(() => {
    localStorage.setItem("pusat_game_secs_remaining", secsRemaining.toString());
  }, [secsRemaining]);

  // Search debouncing handler
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 450);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset page and reload games list when filtering conditions change
  useEffect(() => {
    setPage(1);
    fetchGames(1, selectedCategory, debouncedSearch, true);
  }, [selectedCategory, debouncedSearch]);

  // Sync favorites & DANA balance back to localStorage
  useEffect(() => {
    localStorage.setItem("pusat_game_favs", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem("pusat_game_dana", danaBalance.toString());
  }, [danaBalance]);

  useEffect(() => {
    localStorage.setItem("pusat_game_played_count", gamesPlayedCount.toString());
  }, [gamesPlayedCount]);

  useEffect(() => {
    localStorage.setItem("pusat_game_reward_min", rewardMin.toString());
  }, [rewardMin]);

  useEffect(() => {
    localStorage.setItem("pusat_game_reward_max", rewardMax.toString());
  }, [rewardMax]);

  useEffect(() => {
    localStorage.setItem("pusat_game_wheel_rewards", JSON.stringify(wheelRewards));
  }, [wheelRewards]);

  // Fetch active Dana Kaget link from server
  const fetchDanaKaget = async () => {
    try {
      const res = await fetch(getApiUrl("/api/dana-kaget"));
      if (res.ok) {
        const data = await res.json();
        const incomingLink = data.link || "";
        
        // Detect if link is newly shared or updated
        if (incomingLink && incomingLink !== prevDanaKagetLink.current) {
          showNotification(
            "🎁 DANA Kaget Meluncur!",
            "Admin baru saja membagikan link DANA Kaget gratis! Klik untuk berburu saldo!",
            "⚡",
            "danakaget"
          );
        }
        
        prevDanaKagetLink.current = incomingLink;
        setDanaKagetLink(incomingLink);
        setDanaKagetTime(data.updatedAt || "");
      }
    } catch (e) {
      console.warn("Gagal mengambil info Dana Kaget:", e);
    }
  };

  // UNITY ADS SDK INTEGRATION METHOD
  const handleWatchUnityAd = () => {
    if (isAdLoading || showUnityAdPlayer) return;
    
    setIsAdLoading(true);
    
    // Simulate Unity Ads SDK load handshake
    setTimeout(() => {
      setIsAdLoading(false);
      setShowUnityAdPlayer(true);
      setAdSecondsLeft(15);
      setActiveAdTopic(Math.floor(Math.random() * 3));
      
      // Request native audio play to enhance gaming immersion
      try {
        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.frequency.value = 440;
        gain.gain.setValueAtTime(0.04, context.currentTime);
        oscillator.start();
        setTimeout(() => oscillator.stop(), 200);
      } catch (e) {}
    }, 1200);
  };

  // Tick timer down for active Ad playing
  useEffect(() => {
    if (!showUnityAdPlayer || adSecondsLeft <= 0) return;

    const adInterval = setInterval(() => {
      setAdSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(adInterval);
          return 0;
        }
        
        // Subtle ticking sound effect for ads
        if (!isAdSoundMuted) {
          try {
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = context.createOscillator();
            const g = context.createGain();
            osc.connect(g);
            g.connect(context.destination);
            osc.frequency.value = 600;
            g.gain.setValueAtTime(0.01, context.currentTime);
            osc.start();
            setTimeout(() => osc.stop(), 50);
          } catch (e) {}
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(adInterval);
  }, [showUnityAdPlayer, adSecondsLeft, isAdSoundMuted]);

  // Complete reward collection once simulation ends
  const handleClaimAdReward = () => {
    if (adSecondsLeft > 0) return; // Protected until finished
    
    // Add Coins
    setDanaBalance((prev) => prev + rewardedCoinsPerAd);
    setShowUnityAdPlayer(false);
    
    showNotification(
      "💎 Rezeki Unity Ads!",
      `Misi berhasil! +${rewardedCoinsPerAd.toLocaleString("id-ID")} Koin telah ditambahkan ke saldo Anda!`,
      "🎉",
      "coin"
    );
  };


  useEffect(() => {
    fetchDanaKaget();
    const interval = setInterval(fetchDanaKaget, 15000); // Poll every 15s to react fast

    // Request notification permissions gracefully on user interaction
    if ("Notification" in window && Notification.permission === "default") {
      const askPermission = () => {
        Notification.requestPermission();
        document.removeEventListener("click", askPermission);
      };
      document.addEventListener("click", askPermission);
    }

    return () => clearInterval(interval);
  }, []);

  const handleShareDanaKaget = async () => {
    if (!adminDanaKagetInput.trim()) {
      alert("Masukkan link Dana Kaget yang valid!");
      return;
    }
    try {
      const res = await fetch(getApiUrl("/api/admin/dana-kaget"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passcode: adminPasscode,
          link: adminDanaKagetInput.trim()
        })
      });
      if (res.ok) {
        alert("Berhasil membagikan link DANA Kaget ke seluruh user!");
        fetchDanaKaget();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal membagikan link.");
      }
    } catch (e) {
      alert("Gagal menghubungi server.");
    }
  };

  const handleDeleteDanaKaget = async () => {
    try {
      const res = await fetch(getApiUrl("/api/admin/dana-kaget"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passcode: adminPasscode,
          link: ""
        })
      });
      if (res.ok) {
        alert("Berhasil menghapus link Dana Kaget!");
        setAdminDanaKagetInput("");
        fetchDanaKaget();
      }
    } catch (e) {
      alert("Gagal menghubungi server.");
    }
  };

  // Fetch games API handler
  const fetchGames = async (
    targetPage: number, 
    category: string, 
    search: string, 
    replaceCurrent: boolean
  ) => {
    try {
      setLoading(true);
      setErrorMessage("");
      const res = await fetch(getApiUrl(`/api/games?page=${targetPage}&pagination=12&category=${category}&search=${search}`));
      if (!res.ok) {
        throw new Error("Gagal mengambil data game dari server.");
      }
      const data = await res.json();
      
      if (replaceCurrent) {
        setGames(data.items || []);
      } else {
        setGames(prev => {
          // Avoid appending duplicate IDs
          const existingIds = new Set(prev.map(g => g.id));
          const uniques = (data.items || []).filter((g: Game) => !existingIds.has(g.id));
          return [...prev, ...uniques];
        });
      }
      setHasMore(data.hasMore || false);
      setTotalCount(data.total || 0);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Gagal menghubungkan ke server game.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchGames(nextPage, selectedCategory, debouncedSearch, false);
    }
  };

  const toggleFavorite = (gameId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(gameId) ? prev.filter(id => id !== gameId) : [...prev, gameId]
    );
  };

  // Convert quality score, making sure ratings reflect screenshot (4.2 - 4.8)
  const getSimulatedRating = (score: number) => {
    const base = 4.0;
    const modifier = score * 0.9;
    return (base + modifier).toFixed(1);
  };

  // Helper to format wheels reward text label
  const formatWheelVal = (val: number) => {
    const v = Number(val) || 0;
    if (v >= 1000000) {
      const m = v / 1000000;
      return `${m % 1 === 0 ? m : m.toFixed(1)}Jt Koin`;
    }
    if (v >= 1000) {
      const k = v / 1000;
      return `${k % 1 === 0 ? k : k.toFixed(1)}rb Koin`;
    }
    return `${v} Koin`;
  };

  // Simulate play to award DANA Coins points!
  const launchActiveGame = (game: Game) => {
    setPlayingGame(game);
    setSelectedGame(null);
    setGamesPlayedCount(prev => prev + 1);
    
    // Memberikan bonus saldo DANA setiap kali memulai bermain game!
    const min = Number(rewardMin) || 0;
    const max = Number(rewardMax) || 0;
    const range = Math.max(0, max - min) + 1;
    const rewardBonus = Math.floor(Math.random() * range) + min;
    
    setTimeout(() => {
      setDanaBalance(prev => prev + rewardBonus);
      setClaimAmount(rewardBonus);
      setShowClaimSuccess(true);
      showNotification(
        "🎮 Bonus Bermain Game!",
        `Selamat! Anda mengklaim +${rewardBonus.toLocaleString("id-ID")} Koin dari aktivitas bermain game!`,
        "💰",
        "coin"
      );
    }, 3000); // Popup rewards appear after 3s of loading
  };

  // Lucky wheel spin function
  const handleSpinWheel = () => {
    if (isSpinning) return;
    if (wheelCooldownSecs > 0) {
      alert(`Mohon tunggu ${Math.floor(wheelCooldownSecs / 60)} menit ${wheelCooldownSecs % 60} detik lagi untuk memutar roda!`);
      return;
    }
    
    setIsSpinning(true);

    // Set timestamp of spin to prevent repeat
    const now = Date.now();
    setLastWheelSpin(now);
    localStorage.setItem("pusat_game_last_wheel_spin", now.toString());
    
    // Choose a random rewards segment based on dynamic admin configuration
    const segmentRewards = (wheelRewards && wheelRewards.length === 8 ? wheelRewards : [120000, 25000, 80000, 15000, 50000, 30000, 100000, 10000]).map(Number);
    const segmentIndex = Math.floor(Math.random() * segmentRewards.length);
    const degreesToSpin = 360 * 5 + (segmentIndex * 45); // 5 full rotations + segment angle
    
    setWheelDegree(degreesToSpin);

    setTimeout(() => {
      setIsSpinning(false);
      const wonAmount = segmentRewards[segmentIndex];
      setDanaBalance(prev => prev + wonAmount);
      setClaimAmount(wonAmount);
      setShowClaimSuccess(true);
      setShowLuckyWheel(false);
      showNotification(
        "🎡 Jackpot Roda Keberuntungan!",
        `Selamat! Anda memenangkan grand prize sebesar +${wonAmount.toLocaleString("id-ID")} Koin dari putaran roda!`,
        "💎",
        "coin"
      );
      // Reset rotation back to a low value
      setWheelDegree(segmentIndex * 45);
    }, 4500);
  };

  // Processes a real payout withdrawal request via backend API
  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawalPhone || withdrawalPhone.length < 9) {
      alert("Masukkan nomor e-wallet yang valid!");
      return;
    }
    if (danaBalance < 5000000) {
      alert("Minimal penarikan adalah 5.000.000 Koin (setara dengan Rp 50.000)! Ayo mainkan lebih banyak game.");
      return;
    }

    const withdrawAmountRupiah = Math.floor(danaBalance / 100);

    try {
      setLoading(true);
      const res = await fetch(getApiUrl("/api/withdraw"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: withdrawalPhone,
          amount: withdrawAmountRupiah,
          walletType: withdrawalWallet
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal mengirim permintaan penarikan.");
      }

      const data = await res.json();
      if (data.success) {
        // Set claimAmount to withdrawAmountRupiah so the modal displays Rp value sent to the phone
        setClaimAmount(withdrawAmountRupiah);
        setDanaBalance(0);
        setWithdrawalSuccess(true);
        // Refresh admin data queue if admin is opened
        if (isAdminLoggedIn) {
          fetchAdminWithdrawals(adminPasscode);
        }
      }
    } catch (err: any) {
      alert(err.message || "Gagal menghubungi server untuk pencairan saldo.");
    } finally {
      setLoading(false);
      setTimeout(() => {
        setShowWithdrawModal(false);
        setWithdrawalSuccess(false);
        setWithdrawalPhone("");
      }, 4000);
    }
  };

  // Fetches transaction requests queue for the Admin Dashboard
  const fetchAdminWithdrawals = async (passCodeToTry: string = adminPasscode) => {
    try {
      setAdminLoading(true);
      const res = await fetch(getApiUrl(`/api/admin/withdrawals?passcode=${encodeURIComponent(passCodeToTry)}`));
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal memuat daftar penarikan.");
      }
      const data = await res.json();
      setAdminWithdrawals(data.withdrawals || []);
      setIsAdminLoggedIn(true);
    } catch (err: any) {
      alert(err.message || "Kode sandi Admin salah atau gagal mengambil data.");
      setIsAdminLoggedIn(false);
    } finally {
      setAdminLoading(false);
    }
  };

  // Approves/Rejects a specific payout transaction
  const handleUpdateStatus = async (wdId: string, newStatus: "Disetujui" | "Ditolak") => {
    try {
      const res = await fetch(getApiUrl(`/api/admin/withdrawals/${wdId}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passcode: adminPasscode,
          status: newStatus
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal mengupdate status transaksi.");
      }
      const data = await res.json();
      if (data.success) {
        fetchAdminWithdrawals(adminPasscode);
      }
    } catch (err: any) {
      alert(err.message || "Gagal memproses transaksi.");
    }
  };

  const handleChangePassword = async () => {
    if (!newAdminPasscode.trim()) {
      alert("Masukkan kata sandi baru!");
      return;
    }
    if (newAdminPasscode.trim().length < 4) {
      alert("Sandi baru minimal harus 4 karakter!");
      return;
    }
    try {
      const res = await fetch(getApiUrl("/api/admin/change-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passcode: adminPasscode,
          newPasscode: newAdminPasscode.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Kata sandi berhasil diperbarui!");
        setAdminPasscode(newAdminPasscode.trim());
        setNewAdminPasscode("");
        setShowPasswordChangeGroup(false);
      } else {
        alert(data.error || "Gagal memperbarui sandi.");
      }
    } catch (e) {
      alert("Gagal menghubungi server untuk mengganti kata sandi.");
    }
  };

  // Main UI Chips
  const categoryChips = [
    { id: "all", label: "Semua Game" },
    { id: "board", label: "Board" },
    { id: "arcade", label: "Arcade" },
    { id: "puzzle", label: "Puzzle" },
    { id: "action", label: "Action" },
    { id: "quiz", label: "Quiz" },
    { id: "sports", label: "Sports" },
    { id: "adventure", label: "Adventure" }
  ];

  return (
    <div id="pusat-game-viewport" className="min-h-screen bg-gradient-to-b from-[#0c051a] via-[#120726] to-[#1a0c32] text-white font-sans antialiased relative overflow-x-hidden selection:bg-[#7c3aed] selection:text-white">
      
      {/* PHONE NOTIFICATION BAR */}
      <div className="fixed top-2 left-0 right-0 z-[100] px-4 pointer-events-none flex flex-col gap-2 items-center">
        <AnimatePresence>
          {notifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: -80, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -40, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="pointer-events-auto w-full max-w-sm bg-black/95 border border-purple-500/30 rounded-2xl p-3.5 shadow-[0_12px_45px_rgba(0,0,0,0.85)] backdrop-blur-xl flex gap-3 relative cursor-pointer active:scale-98 transition-transform"
              onClick={() => {
                if (notif.category === "danakaget") {
                  const dkSection = document.getElementById("dana-kaget-section");
                  if (dkSection) {
                    dkSection.scrollIntoView({ behavior: "smooth" });
                  }
                }
                setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
              }}
            >
              {/* Notif Left Side Icon */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center text-lg shadow-inner shrink-0 relative">
                {notif.icon}
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 text-[8px] justify-center items-center font-bold text-white">✓</span>
                </span>
              </div>

              {/* Notif Body */}
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center justify-between text-[10px] text-purple-400 font-bold tracking-wider mb-0.5">
                  <span className="truncate">🔔 NOTIFIKASI INSTAN</span>
                  <span>Sekarang</span>
                </div>
                <h4 className="text-xs font-black text-white leading-tight truncate mb-0.5">
                  {notif.title}
                </h4>
                <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                  {notif.message}
                </p>
              </div>

              {/* Dismiss Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
                }}
                className="absolute top-3.5 right-3.5 text-slate-500 hover:text-white transition-colors p-0.5 rounded-full"
              >
                <span className="text-[10px]">✕</span>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {/* HEADER BAR */}
      <header className="sticky top-0 z-40 bg-[#0d051c]/90 backdrop-blur-xl border-b border-[#2d1154]/50 shadow-lg px-4 py-3.5">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7c3aed] to-[#3b82f6] flex items-center justify-center shadow-inner ring-2 ring-[#7c3aed]/30 animate-pulse">
              <Gamepad2 className="w-5.5 h-5.5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight font-display bg-gradient-to-r from-white via-slate-100 to-[#caa5ff] bg-clip-text text-transparent">
                PUSAT GAME
              </h1>
              <p className="text-[10px] text-purple-300 font-medium tracking-widest uppercase">
                Banyak Pilihan Seru
              </p>
            </div>
          </div>

          {/* Right Area: Active Timer & Balance Widgets */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Active player countdown bar */}
            <div 
              title={isPlayerActive ? "Bermain aktif menambah koin!" : "Idle (Tidak aktif). Gerakkan mouse / sentuh layar!"}
              className="bg-[#1f0b3b] border border-[#521ca6]/40 px-2 py-1 rounded-full flex items-center gap-1.5 text-[9px] font-extrabold"
            >
              <div className="relative flex h-1.5 w-1.5">
                <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${isPlayerActive ? "animate-ping bg-emerald-400" : "bg-yellow-500"}`}></span>
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isPlayerActive ? "bg-emerald-400" : "bg-yellow-500"}`}></span>
              </div>
              <span className="font-mono text-purple-200">
                {Math.floor(secsRemaining / 60)}:{( "0" + (secsRemaining % 60) ).slice(-2)}
              </span>
              <span className="text-yellow-400 text-[8px] font-black">+500</span>
            </div>

            {/* DANA Balance Widget */}
            <div 
              onClick={() => setShowWithdrawModal(true)}
              className="bg-[#240e42] hover:bg-[#32135c] border border-[#5d1fb8]/60 rounded-full pl-2 pr-2.5 py-1 flex items-center gap-1.5 cursor-pointer transition-all duration-300 active:scale-95 shadow-md hover:shadow-[#7c3aed]/20"
            >
              <div className="w-4 h-4 rounded-full bg-[#f59e0b] flex items-center justify-center animate-spin-slow">
                <span className="text-[9px]">🪙</span>
              </div>
              <div className="text-right">
                <span className="block text-[7px] text-yellow-300 leading-none font-bold uppercase">Koin</span>
                <span className="block text-[11px] font-bold text-yellow-400 font-mono">
                  {danaBalance.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* VIEWPORT CONSTRAINED WRAPPER (Designed for Desktop & Mobile layout optimization) */}
      <main className="max-w-md mx-auto px-4 pb-20 pt-4">

        {/* PROMO BANNER / REWARD ACTION BAR */}
        <div className="relative mb-5 bg-gradient-to-r from-[#211244] to-[#12082b] border-2 border-[#521ca6]/80 rounded-2xl overflow-hidden p-4 shadow-xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 blur-xl rounded-full"></div>
          
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#dc2626] flex items-center justify-center text-white shrink-0 shadow-lg shadow-orange-900/30">
              <Coins className="w-7 h-7 text-yellow-300 animate-bounce" />
            </div>
            <div>
              <span className="inline-block bg-[#f59e0b]/20 text-[#fbbf24] text-[9px] font-semibold px-2 py-0.5 rounded-full mb-1">
                KUMPULKAN KOIN GRATIS
              </span>
              <h3 className="text-sm font-bold leading-snug">
                Main Sekarang & Kumpulkan Koin!
              </h3>
              <p className="text-xs text-purple-300 mt-0.5">
                Lebih banyak game dimainkan, makin melimpah Koin yang bisa dicairkan ke saldo dompet digital Anda!
              </p>
            </div>
          </div>

          <div className="mt-3.5 flex items-center gap-2">
            <button 
              onClick={() => setShowLuckyWheel(true)}
              className="flex-1 text-center py-2 px-3 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#5b21b6] text-white text-xs font-bold shadow-md hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
            >
              <Gift className="w-4 h-4 text-yellow-300" /> 
              {wheelCooldownSecs > 0 ? (
                <span>Lucky Wheel (CD: {Math.floor(wheelCooldownSecs / 60)}:{( "0" + (wheelCooldownSecs % 60) ).slice(-2)})</span>
              ) : (
                <span>Putar Roda Lucky Wheel</span>
              )}
            </button>
            <button 
              onClick={() => setShowWithdrawModal(true)}
              className="py-2 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold active:scale-[0.98] transition-all"
            >
              Cairkan
            </button>
          </div>
        </div>

        {/* UNITY ADS REWARD STATION */}
        <div className="relative mb-5 bg-gradient-to-b from-[#180931] to-[#0f0422] border border-purple-500/30 rounded-2xl overflow-hidden p-4 shadow-xl">
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 blur-xl rounded-full"></div>
          
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 flex items-center justify-center text-white shrink-0 shadow-md">
              <span className="text-xl animate-bounce">📺</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="inline-block bg-purple-400/20 text-purple-300 text-[8px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-widest leading-none">
                  Misi Harian gratis
                </span>
              </div>
              <h3 className="text-xs font-extrabold text-white leading-snug mt-1.5 flex items-center gap-1">
                Tonton Video Berhadiah
              </h3>
              <p className="text-[10px] text-purple-300 mt-1 leading-normal">
                Selesaikan menonton iklan video pendek selama 15 detik dan raih bonus instan <strong className="text-yellow-400">+{rewardedCoinsPerAd.toLocaleString("id-ID")} Koin</strong> ke akun Anda!
              </p>
            </div>
          </div>

          <div className="mt-3">
            <button 
              onClick={handleWatchUnityAd}
              disabled={isAdLoading || showUnityAdPlayer}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-black shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                isAdLoading 
                ? "bg-purple-900/50 text-purple-300 border border-purple-500/20 cursor-wait"
                : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:brightness-110 border border-purple-400/30"
              }`}
            >
              {isAdLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-purple-300" />
                  <span>MEMBUKA VIDEO BERHADIAH...</span>
                </>
              ) : (
                <>
                  <span>▶️ TONTON SEKARANG (+{rewardedCoinsPerAd.toLocaleString("id-ID")} Koin)</span>
                </>
              )}
            </button>
            <span className="block text-[8px] text-center text-purple-400/60 mt-1.5 leading-relaxed">
              *Pastikan menonton sampai video selesai agar koin bonus berhasil ditambahkan ke saldo Anda secara otomatis.
            </span>
          </div>
        </div>

        {/* PERSISTENT DANA KAGET REMINDER INFO */}
        <div className="mb-5 bg-[#1a103c]/90 border border-purple-500/20 rounded-2xl p-3 shadow-md flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <Bell className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h5 className="text-[10px] font-black tracking-wider text-amber-400 uppercase">Pengumuman</h5>
            <p className="text-[11px] text-purple-200/90 leading-tight mt-0.5 font-medium">
              Selalu bermainlah, karena <span className="text-yellow-300 font-bold">DANA Kaget</span> akan dikirim sewaktu-waktu ke dashboard Anda! 🎁
            </p>
          </div>
        </div>

        {/* DANA KAGET ACTIVE NOTIFICATION FOR USER */}
        {danaKagetLink && (
          <motion.div
            id="dana-kaget-section"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-5 bg-gradient-to-r from-emerald-950/80 to-teal-950/70 border-2 border-emerald-500/40 rounded-2xl p-4 shadow-xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-xl rounded-full"></div>
            
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white shrink-0 shadow-md">
                <span className="text-xl animate-bounce">🎁</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-block bg-emerald-500/20 text-emerald-300 text-[8.5px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                    DANA KAGET AKTIF
                  </span>
                  {danaKagetTime && (
                    <span className="text-[9px] text-[#78ffd6]/75 font-mono">
                      {new Date(danaKagetTime).toLocaleDateString("id-ID")} {new Date(danaKagetTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-extrabold text-white mt-1 border-b border-white/5 pb-1">
                  Ada Dana Kaget Spesial Untukmu!
                </h4>
                <p className="text-[11px] text-emerald-200/90 leading-tight mt-1.5 font-medium">
                  Admin baru saja membagikan link DANA KAGET saldo DANA gratis. Klik tombol di bawah atau salin link untuk mengklaim.
                </p>
                
                {/* Responsive link triggers with secure copy helper */}
                <div className="mt-3.5 flex items-center gap-1.5 flex-wrap">
                  <a
                    href={danaKagetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[120px] text-center py-2 px-3 rounded-xl bg-gradient-to-r from-[#00c6ff] to-[#0072ff] hover:brightness-110 text-white text-xs font-black shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    🚀 AMBIL DANA KAGET
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(danaKagetLink);
                      alert("Link Dana Kaget berhasil disalin! Silakan tempel (paste) di browser Anda jika tidak otomatis terbuka.");
                    }}
                    className="py-2 px-3 rounded-xl bg-emerald-900/40 hover:bg-emerald-900/70 border border-emerald-500/30 text-emerald-300 text-xs font-bold active:scale-[0.98] transition-all flex items-center justify-center gap-1 shrink-0"
                  >
                    📋 Salin Link
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* SEARCH AND FILTER BAR */}
        <div className="flex items-center gap-2 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 w-4.5 h-4.5 text-purple-300/60 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Cari ratusan game instan..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#251044] border border-[#532694]/50 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] focus:outline-none rounded-xl text-sm placeholder-purple-300/40 text-purple-50"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-300/50 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <button 
            onClick={() => alert("Urutan standar game berdasarkan popularitas & kualitas terbaik!")}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#251044] border border-[#532694]/50 hover:bg-[#341660] transition-colors"
            title="Filter Sortir"
          >
            <SlidersHorizontal className="w-4.5 h-4.5 text-purple-300" />
          </button>
        </div>

        {/* HORIZONTAL CATEGORIES CHIP PANEL */}
        <div className="overflow-x-auto no-scrollbar flex items-center gap-2 mb-6 scroll-smooth">
          {categoryChips.map((chip) => {
            const isActive = selectedCategory === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setSelectedCategory(chip.id)}
                className={`px-4 py-2 text-xs font-semibold rounded-full transition-all duration-300 whitespace-nowrap active:scale-95 ${
                  isActive 
                    ? "bg-[#7c3aed] text-white shadow-md shadow-[#7c3aed]/20 ring-1 ring-purple-400/30" 
                    : "bg-[#251044] text-purple-200 border border-[#521ca6]/40 hover:bg-[#331561]"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* FEED METADATA HEADER */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5 text-xs text-purple-300 font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
            {totalCount > 0 ? (
              <span>Menampilkan <strong className="text-white">{games.length}</strong> dari {totalCount} Game</span>
            ) : (
              <span>Mencari game unggulan...</span>
            )}
          </div>
          {favorites.length > 0 && (
            <span className="text-[10px] bg-[#fb7185]/20 text-rose-400 font-semibold px-2 py-0.5 rounded-md">
              ❤️ {favorites.length} Favorit
            </span>
          )}
        </div>

        {/* ERROR SCREEN */}
        {errorMessage && (
          <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-4 text-center my-6">
            <p className="text-xs text-red-300 font-medium mb-3">{errorMessage}</p>
            <button 
              onClick={() => fetchGames(1, selectedCategory, debouncedSearch, true)}
              className="bg-red-800 hover:bg-red-700 text-white rounded-lg px-4 py-1.5 text-xs font-bold transition-all"
            >
              Coba Ulangi
            </button>
          </div>
        )}

        {/* GAME GRID CONTAINER */}
        <div className="grid grid-cols-3 gap-3">
          {games.map((game, index) => {
            const rating = getSimulatedRating(game.quality_score);
            const isFav = favorites.includes(game.id);

            return (
              <motion.div
                key={`${game.id}-${index}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.4) }}
                onClick={() => setSelectedGame(game)}
                className="group relative flex flex-col bg-[#1c0a37] hover:bg-[#250d49] border border-[#431885]/40 rounded-2xl p-2 cursor-pointer transition-all duration-300 hover:scale-[1.03] shadow-md hover:shadow-purple-900/10 h-full justify-between"
              >
                <div>
                  {/* Thumbnail Cover Image with Gradient Vignette */}
                  <div className="aspect-square w-full bg-[#130726] rounded-xl overflow-hidden relative">
                    <img 
                      src={game.banner_image || game.image} 
                      alt={game.title} 
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      onError={(e) => {
                        // Fallback to high-quality dummy logo if image breaks
                        (e.target as HTMLImageElement).src = game.image || `https://placehold.co/300x300/1a0c32/ffffff?text=${encodeURIComponent(game.title)}`;
                      }}
                    />
                    
                    {/* Shadow overlay overlaying images bottom */}
                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent"></div>
                    
                    {/* Favorite Heart Trigger */}
                    <button
                      onClick={(e) => toggleFavorite(game.id, e)}
                      className="absolute top-1.5 right-1.5 w-6.5 h-6.5 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center hover:bg-black/60 transition-colors"
                    >
                      <Heart className={`w-3.5 h-3.5 ${isFav ? "fill-rose-500 text-rose-500" : "text-white"}`} />
                    </button>

                    {/* Small category tag in thumbnail */}
                    <span className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-md text-[8px] text-purple-200 px-1 py-0.5 rounded font-mono capitalize">
                      {game.category.split("-")[0]}
                    </span>
                  </div>

                  {/* Title and Secondary Specs */}
                  <h4 className="text-[11px] font-bold text-white tracking-wide truncate mt-2 leading-tight group-hover:text-purple-300 transition-colors">
                    {game.title}
                  </h4>
                  <p className="text-[8.5px] text-purple-300 truncate font-medium capitalize mt-0.5 leading-none">
                    {game.category.replace("-", " ")}
                  </p>
                </div>

                {/* Rating & Action Button Combo Row */}
                <div className="flex items-center justify-between mt-2 pt-1 border-t border-[#431885]/20">
                  <div className="flex items-center gap-0.5">
                    <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                    <span className="text-[9px] font-bold text-yellow-400">{rating}</span>
                  </div>

                  {/* Circle Play Button */}
                  <div className="w-5.5 h-5.5 rounded-full bg-[#7c3aed] group-hover:bg-[#8b5cf6] flex items-center justify-center text-white scale-90 group-hover:scale-100 transition-all shadow-md">
                    <Play className="w-2.5 h-2.5 fill-white text-white ml-0.5" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* LOADING INDICATORS */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            <span className="text-xs text-purple-300 font-medium">Memuat game seru...</span>
          </div>
        )}

        {/* NO RESULTS VIEW */}
        {!loading && games.length === 0 && (
          <div className="text-center py-12 bg-[#1c0a37]/30 border border-[#431885]/20 rounded-2xl mt-4">
            <Gamepad2 className="w-12 h-12 text-purple-400/40 mx-auto mb-3" />
            <p className="text-sm text-purple-200 font-semibold">Game Tidak Ditemukan</p>
            <p className="text-xs text-purple-400 mt-1 max-w-[240px] mx-auto">
              Coba kurangi kata kunci pencarian atau ganti kategori game.
            </p>
          </div>
        )}

        {/* LOAD MORE TRIGGER BUTTON */}
        {!loading && hasMore && (
          <div className="mt-8 text-center pb-8">
            <button
              onClick={handleLoadMore}
              className="bg-[#240e43] hover:bg-[#341660] border border-[#53249e] px-8 py-3 rounded-2xl text-xs font-bold tracking-wider hover:border-purple-400 transition-all duration-300 w-full"
            >
              Tampilkan Lebih Banyak Game
            </button>
          </div>
        )}

        {/* EMPTY FOOTER FOR FILL */}
        <div className="mt-12 text-center pb-8 border-t border-purple-900/20 pt-6">
          <p className="text-[10px] text-purple-400/60 mb-2">
            Ditenagai oleh GamePix Feed API • Hubungkan DANA Anda
          </p>
          <button
            onClick={() => setIsAdminMode(true)}
            className="text-[10px] text-purple-400/30 hover:text-purple-300/60 bg-transparent border border-transparent hover:border-purple-900/30 px-2 py-0.5 rounded transition-all cursor-pointer inline-flex items-center gap-1"
          >
            ⚙️ Sinkronisasi Keamanan & Lisensi Sistem
          </button>
        </div>

      </main>

      {/* OVERLAY: GAME DETAIL DRAWER / POPUP */}
      <AnimatePresence>
        {selectedGame && (
          <>
            {/* Backdrop shadow */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedGame(null)}
              className="fixed inset-0 bg-black z-50 pointer-events-auto"
            />

            {/* Bottom Sheet Modal */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 23, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 bg-[#160a2b] border-t-2 border-[#6027b4] rounded-t-[30px] p-6 z-50 max-w-md mx-auto shadow-2xl"
            >
              {/* Top notch indicator */}
              <div className="w-12 h-1.5 bg-purple-950 rounded-full mx-auto mb-4" />

              <div className="flex items-start gap-4">
                <img 
                  src={selectedGame.image || selectedGame.banner_image} 
                  alt={selectedGame.title} 
                  className="w-20 h-20 rounded-2xl object-cover border border-[#431885] bg-[#0c051a]"
                />
                <div className="flex-1 min-w-0">
                  <span className="bg-[#7c3aed]/20 text-[#caa5ff] text-[10px] font-bold px-2 py-0.5 rounded-full capitalize">
                    {selectedGame.category.replace("-", " ")}
                  </span>
                  <h3 className="text-lg font-extrabold text-white mt-1 leading-snug">
                    {selectedGame.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-orange-400 mt-1 font-bold">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    <span>{getSimulatedRating(selectedGame.quality_score)} Rating</span>
                    <span className="text-[#3b82f6] ml-2">Orientasi: {selectedGame.orientation}</span>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedGame(null)}
                  className="w-8 h-8 rounded-full bg-purple-950/60 flex items-center justify-center hover:bg-purple-900 transition-colors"
                >
                  <X className="w-4 h-4 text-purple-200" />
                </button>
              </div>

              {/* Game Info Body text */}
              <div className="my-5">
                <h4 className="text-xs font-bold text-purple-300 uppercase tracking-widest mb-1.5">Deskripsi Game</h4>
                <p className="text-xs text-purple-100 leading-relaxed max-h-24 overflow-y-auto pr-1">
                  {selectedGame.description || "Temukan keseruan tak terbatas dalam game yang menantang pikiran ini. Kontrol yang responsif dan grafis elegan memberikan visual terbaik."}
                </p>
              </div>

              {/* Action Buttons inside detail */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const isFav = favorites.includes(selectedGame.id);
                    setFavorites(prev => 
                      isFav ? prev.filter(id => id !== selectedGame.id) : [...prev, selectedGame.id]
                    );
                  }}
                  className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all ${
                    favorites.includes(selectedGame.id)
                      ? "bg-rose-950/40 border-rose-500/50 text-rose-500"
                      : "bg-[#251044]/50 border-purple-500/30 text-purple-300 hover:text-white"
                  }`}
                  title="Favoritkan"
                >
                  <Heart className={`w-5 h-5 ${favorites.includes(selectedGame.id) ? "fill-rose-500" : ""}`} />
                </button>

                <button
                  onClick={() => launchActiveGame(selectedGame)}
                  className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] text-white text-sm font-bold shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <Play className="w-4 h-4 fill-white text-white" />
                  MAIN SEKARANG & DAPAT SALDO
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* FULLSCREEN GAME PLAYPORT OVERLAY */}
      <AnimatePresence>
        {playingGame && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 bg-[#070212] z-50 flex flex-col justify-between"
          >
            {/* Top Play Control Bar */}
            <div className="bg-[#120726] border-b border-purple-900/40 px-4 py-3 flex items-center justify-between">
              <button 
                onClick={() => setPlayingGame(null)}
                className="flex items-center gap-1.5 text-xs font-bold text-purple-300 hover:text-white transition-colors py-1.5 pr-3 rounded-lg"
              >
                <ArrowLeft className="w-4 h-4" />
                Kembali
              </button>

              <div className="flex items-center gap-2 max-w-[180px]">
                <img 
                  src={playingGame.image || playingGame.banner_image} 
                  alt={playingGame.title} 
                  className="w-5.5 h-5.5 rounded object-cover" 
                />
                <span className="text-xs font-bold truncate text-white block">
                  {playingGame.title}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    // Quick reload iframe
                    const iframe = document.getElementById("game-frame") as HTMLIFrameElement;
                    if (iframe) {
                      iframe.src = iframe.src;
                    }
                  }}
                  className="w-7.5 h-7.5 rounded-lg bg-purple-950/50 hover:bg-purple-900 flex items-center justify-center"
                  title="Reload Game"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-purple-300" />
                </button>

                <button
                  onClick={() => {
                    // Open in separate full-screen tab to ensure best mobile layouts
                    window.open(playingGame.url, "_blank");
                  }}
                  className="w-7.5 h-7.5 rounded-lg bg-blue-950/50 hover:bg-blue-900 flex items-center justify-center text-blue-400"
                  title="Main Layar Penuh"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Seamless Responsive Gaming iframe viewport */}
            <div className="flex-1 relative w-full h-full bg-black">
              <iframe
                id="game-frame"
                src={playingGame.url}
                className="w-full h-full border-none"
                allow="autoplay; gamepad; fullscreen; screen-wake-lock"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                title={`Play ${playingGame.title}`}
              />
            </div>

            {/* In-Play Gamified Rewards progress footer */}
            <div className="bg-[#120726] border-t border-purple-900/40 px-4 py-2.5 flex items-center justify-between text-[11px] text-purple-300">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                Earning Saldo Aktif
              </div>
              <div>
                Tutup game kapan saja untuk kembali menyimpan reward Anda!
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* REWARDS POPUP: LUCKY WHEEL OF DANA WHEEL */}
      <AnimatePresence>
        {showLuckyWheel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (!isSpinning) setShowLuckyWheel(false); }}
              className="fixed inset-0 bg-black z-50"
            />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-[#160a2b] border-2 border-[#fbbf24] rounded-3xl p-5 z-50 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-extrabold text-yellow-400 flex items-center gap-1">
                  <Gift className="w-4.5 h-4.5 fill-yellow-400" />
                  RODA KEBERUNTUNGAN DANA
                </h3>
                {!isSpinning && (
                  <button 
                    onClick={() => setShowLuckyWheel(false)}
                    className="w-7 h-7 rounded-full bg-purple-950 flex items-center justify-center hover:bg-purple-900 text-purple-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <p className="text-xs text-purple-200 text-center mb-5">
                Putar Roda untuk memenangkan bonus Saldo DANA gratis langsung ke dompet digital Anda!
              </p>

              {/* Visual Spin Wheel */}
              <div className="relative w-48 h-48 mx-auto my-6 flex items-center justify-center">
                
                {/* Pointer indicator pin */}
                <div className="absolute top-0 w-4 h-6 bg-red-500 z-30 clamp-pin flex items-center justify-center rounded-b shadow" style={{ clipPath: "polygon(50% 100%, 0 0, 100% 0)" }}></div>

                {/* Rotating disc */}
                <motion.div
                  style={{ rotate: wheelDegree }}
                  animate={{ rotate: wheelDegree }}
                  transition={{ 
                    duration: isSpinning ? 4.5 : 0.5, 
                    ease: isSpinning ? [0.12, 0.8, 0.2, 1] : "easeOut" 
                  }}
                  className="w-full h-full rounded-full border-4 border-yellow-400 bg-gradient-to-tr from-purple-900 to-indigo-900 flex items-center justify-center overflow-hidden relative shadow-lg"
                >
                  {/* Wheel segments with simple aesthetic divider labels */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-0.5 bg-yellow-400/30 absolute rotate-0"></div>
                    <div className="w-full h-0.5 bg-yellow-400/30 absolute rotate-45"></div>
                    <div className="w-full h-0.5 bg-yellow-400/30 absolute rotate-90"></div>
                    <div className="w-full h-0.5 bg-yellow-400/30 absolute rotate-135"></div>
                  </div>

                  {/* Text labels for the 8 sectors */}
                  <div className="text-[9px] font-bold text-yellow-300 absolute w-full h-full">
                    <span className="absolute top-2 left-1/2 -translate-x-1/2">{formatWheelVal(wheelRewards[0])}</span>
                    <span className="absolute bottom-2 left-1/2 -translate-x-1/2">{formatWheelVal(wheelRewards[4])}</span>
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 rotate-95">{formatWheelVal(wheelRewards[2])}</span>
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-95">{formatWheelVal(wheelRewards[5])}</span>
                    <span className="absolute right-5 top-5 rotate-45">{formatWheelVal(wheelRewards[1])}</span>
                    <span className="absolute left-5 bottom-5 rotate-45">{formatWheelVal(wheelRewards[3])}</span>
                    <span className="absolute left-5 top-5 -rotate-45">{formatWheelVal(wheelRewards[6])}</span>
                    <span className="absolute right-5 bottom-5 -rotate-45">{formatWheelVal(wheelRewards[7])}</span>
                  </div>
                  
                  {/* Inner small core button */}
                  <div className="w-10 h-10 rounded-full bg-[#160a2b] border-2 border-yellow-400 absolute z-20 shadow-inner"></div>
                </motion.div>
              </div>

              {/* Action trigger button */}
              <button
                onClick={handleSpinWheel}
                disabled={isSpinning || wheelCooldownSecs > 0}
                className={`w-full py-3 rounded-xl font-extrabold text-[#160a2b] text-sm shadow-lg transition-all ${
                  isSpinning 
                    ? "bg-amber-600 opacity-60 cursor-not-allowed" 
                    : wheelCooldownSecs > 0
                      ? "bg-purple-950 border border-purple-500/20 text-purple-400 cursor-not-allowed opacity-[0.85]"
                      : "bg-gradient-to-r from-yellow-500 to-amber-600 hover:brightness-110 active:scale-95"
                }`}
              >
                {isSpinning 
                  ? "MEMUTAR RODA..." 
                  : wheelCooldownSecs > 0 
                    ? `DAPAT DIPUTAR LAGI DALAM: ${Math.floor(wheelCooldownSecs / 60)}m ${wheelCooldownSecs % 60}s` 
                    : "MULAI PUTAR GRATIS"
                }
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* DIALOG: REWARD SUCCESS NOTIFICATION CLAIM */}
      <AnimatePresence>
        {showClaimSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-6 left-4 right-4 max-w-sm mx-auto bg-gradient-to-r from-emerald-900 to-[#10b981] text-white p-4 rounded-2xl z-50 shadow-2xl flex items-center justify-between border-2 border-emerald-400"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center animate-bounce">
                <Coins className="w-5.5 h-5.5 text-yellow-300 fill-yellow-300" />
              </div>
              <div>
                <span className="block text-[9px] uppercase tracking-wider text-emerald-200 font-extrabold font-mono">
                  Bonus Koin Ditambahkan
                </span>
                <strong className="text-sm font-extrabold text-white">
                  + {claimAmount.toLocaleString("id-ID")} Koin Berhasil Diperoleh!
                </strong>
              </div>
            </div>
            
            <button 
              onClick={() => setShowClaimSuccess(false)}
              className="bg-white/10 hover:bg-white/20 p-1.5 rounded-lg text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULL SCREEN UNITY ADS IMMERSIVE SIMULATION PLAYER */}
      <AnimatePresence>
        {showUnityAdPlayer && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="fixed inset-0 z-[200] bg-black text-white font-sans flex flex-col select-none overflow-hidden"
          >
            {/* Ad Heading Bar */}
            <div className="bg-[#121212] px-4 py-3 flex items-center justify-between border-b border-neutral-900 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-purple-600 rounded flex items-center justify-center font-black text-white text-[10px] tracking-tighter">🚀</div>
                <span className="text-[10px] font-black text-neutral-300 tracking-wider">VIDEO BERHADIAH</span>
                <span className="text-[8px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono px-1 py-0.2 rounded uppercase animate-pulse">Sponsor</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Mute button */}
                <button 
                  onClick={() => setIsAdSoundMuted(!isAdSoundMuted)}
                  className="w-7 h-7 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-xs"
                  title="Mute ticking sounds"
                >
                  {isAdSoundMuted ? "🔇" : "🔊"}
                </button>

                {/* Timer badge */}
                <div className="bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded-full text-[10px] font-bold text-neutral-400 flex items-center gap-1.5 font-mono">
                  {adSecondsLeft > 0 ? (
                    <>
                      <span>⏱️ Ad ends in</span>
                      <span className="text-yellow-400 font-black">{adSecondsLeft}s</span>
                    </>
                  ) : (
                    <span className="text-emerald-400 font-black">✓ Ad Completed</span>
                  )}
                </div>

                {/* Premium close button locked state */}
                {adSecondsLeft > 0 ? (
                  <div 
                    className="w-7 h-7 rounded-full bg-neutral-900 text-neutral-600 flex items-center justify-center text-xs font-bold cursor-not-allowed"
                    title="Anda harus menonton sampai selesai untuk mengklaim koin bonus"
                  >
                     ✕
                  </div>
                ) : (
                  <button 
                    onClick={handleClaimAdReward}
                    className="w-7 h-7 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center text-xs font-black shadow-[0_0_12px_rgba(16,185,129,0.5)] animate-bounce"
                  >
                     ✕
                  </button>
                )}
              </div>
            </div>

            {/* Ad Main Immersive Video Trailer Container */}
            <div className="flex-1 bg-gradient-to-b from-[#0a0518] to-[#120f2b] p-5 flex flex-col justify-center items-center relative gap-6">
              
              {/* Ambient ad background elements */}
              <div className="absolute inset-0 overflow-hidden opacity-5 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full blur-3xl animate-pulse"></div>
              </div>

              {/* Trailer Topic 1: ROYAL MATCH RESCUE SIMULATOR */}
              {activeAdTopic === 0 && (
                <div className="w-full max-w-sm bg-neutral-950/80 border border-purple-500/20 rounded-3xl p-5 shadow-2xl relative overflow-hidden flex flex-col items-center">
                  <div className="absolute -top-10 -right-10 w-24 h-24 bg-yellow-400/10 blur-xl rounded-full"></div>
                  
                  {/* Sim gameplay graphics */}
                  <span className="text-[10px] text-yellow-400 font-black bg-yellow-400/10 border border-yellow-400/30 px-2 py-0.5 rounded-full mb-3 uppercase tracking-widest leading-none">
                    🎮 ROYAL MATCH RESCUE
                  </span>

                  <div className="w-full h-36 bg-gradient-to-b from-blue-950 to-indigo-950 border border-indigo-500/20 rounded-2xl flex flex-col justify-end items-center p-3 relative overflow-hidden my-2">
                    {/* Bouncing rising rising water */}
                    <motion.div 
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute bottom-0 left-0 right-0 h-16 bg-blue-500/30 border-t border-blue-400/40 backdrop-blur-xs flex justify-center items-center font-bold text-xs"
                    >
                      Rising Water Level! 🌊
                    </motion.div>

                    {/* Simulated King Sprite */}
                    <motion.div 
                      animate={{ scale: [1, 1.1, 1], rotate: [-2, 2, -2] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="text-4xl z-10 mb-8"
                    >
                      👑
                    </motion.div>

                    <span className="text-[9px] text-[#7c3aed]/90 font-mono bg-black/60 px-2 py-0.5 rounded border border-purple-500/30 z-10 uppercase tracking-widest text-center">
                      TAP TO SAVE THE KING!
                    </span>
                  </div>

                  <p className="text-xs text-neutral-300 text-center leading-relaxed mt-2 p-1 font-semibold">
                    Satu-satunya game petualangan teka-teki logika terbaik tahun ini. Tarik pin yang benar untuk menyelamatkan raja dari air banjir!
                  </p>
                </div>
              )}

              {/* Trailer Topic 2: CANDY JAM DANA RUSH */}
              {activeAdTopic === 1 && (
                <div className="w-full max-w-sm bg-neutral-950/80 border border-[#10b981]/20 rounded-3xl p-5 shadow-2xl relative overflow-hidden flex flex-col items-center">
                  <div className="absolute -top-10 -left-10 w-24 h-24 bg-[#10b981]/10 blur-xl rounded-full"></div>
                  
                  <span className="text-[10px] text-[#10b981] font-black bg-[#10b981]/10 border border-[#10b981]/30 px-2 py-0.5 rounded-full mb-3 uppercase tracking-widest leading-none">
                    🎯 CANDY JAM DANA RUSH
                  </span>

                  <div className="w-full h-36 bg-gradient-to-br from-[#0c1815] to-[#043324] border border-[#10b981]/20 rounded-2xl flex flex-col justify-center items-center p-3 relative overflow-hidden my-2">
                    
                    {/* Confetti raining down */}
                    <div className="absolute inset-0 flex justify-around pointer-events-none opacity-40 flex-row">
                      <span className="text-xs animate-bounce" style={{ animationDelay: "0.1s" }}>🍭</span>
                      <span className="text-xs animate-bounce" style={{ animationDelay: "0.5s" }}>🪙</span>
                      <span className="text-xs animate-bounce" style={{ animationDelay: "0.2s" }}>🍬</span>
                      <span className="text-xs animate-bounce" style={{ animationDelay: "0.4s" }}>🪙</span>
                    </div>

                    {/* Giant Multiplier Combo animation */}
                    <motion.div 
                      animate={{ scale: [0.9, 1.2, 0.9] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                      className="bg-yellow-400 text-neutral-950 font-black px-4 py-2 rounded-2xl text-lg shadow-[0_0_25px_rgba(250,204,21,0.6)] text-center relative z-10"
                    >
                      COMBO x1500! 🎉
                      <span className="block text-[8px] tracking-wider uppercase">Coins Harvested!</span>
                    </motion.div>

                    {/* Money rain */}
                    <span className="text-[9px] text-[#dc2626] font-extrabold bg-black/60 px-2 py-0.5 rounded border border-[#10b981]/30 z-10 uppercase tracking-widest text-center mt-3 animate-ping">
                      💰 +1.000.000 KOIN CAIR!
                    </span>
                  </div>

                  <p className="text-xs text-neutral-300 text-center leading-relaxed mt-2 p-1 font-semibold">
                    Gabungkan barisan permen sejenis dan pecahkan rekor global! Gandakan kemenangan koin Anda langsung ke saldo DANA.
                  </p>
                </div>
              )}

              {/* Trailer Topic 3: SLITHER WORM MULTIPLIER */}
              {activeAdTopic === 2 && (
                <div className="w-full max-w-sm bg-neutral-950/80 border border-blue-500/20 rounded-3xl p-5 shadow-2xl relative overflow-hidden flex flex-col items-center">
                  <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-blue-400/10 blur-xl rounded-full"></div>
                  
                  <span className="text-[10px] text-blue-400 font-black bg-blue-400/10 border border-blue-400/30 px-2 py-0.5 rounded-full mb-3 uppercase tracking-widest leading-none">
                    👾 SLITHER WORM BOOST
                  </span>

                  <div className="w-full h-36 bg-gradient-to-r from-neutral-900 to-indigo-950 border border-blue-500/20 rounded-2xl flex flex-col justify-center items-center p-3 relative overflow-hidden my-2">
                    {/* Worm path drawing */}
                    <motion.div 
                      animate={{ x: [-20, 20, -20], y: [-10, 10, -10] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="text-3xl filter drop-shadow-[0_0_8px_rgba(59,130,246,0.6)] z-10"
                    >
                      🟢🔵🟠🟣🐍
                    </motion.div>

                    <span className="text-[9px] text-yellow-400 font-black bg-black/50 border border-yellow-400/20 px-2 py-0.5 rounded z-10 tracking-wider text-center mt-6">
                      SCORE: 48,150 (x50 MULTIPLIER!) ⚡
                    </span>
                  </div>

                  <p className="text-xs text-neutral-300 text-center leading-relaxed mt-2 p-1 font-semibold">
                    Makan bola-bola bercahaya sebanyak mungkin dan kalahkan ular saingan untuk menjadi penakluk papan peringkat terbesar!
                  </p>
                </div>
              )}

              {/* End-Card complete reward callout banner */}
              {adSecondsLeft <= 0 && (
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="w-full max-w-sm bg-gradient-to-r from-emerald-950/90 to-cyan-950/90 border-2 border-emerald-400 rounded-2xl p-4 shadow-2xl text-center relative z-20"
                >
                  <div className="absolute -top-7 -right-7 text-2xl animate-bounce">🏆</div>
                  <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest">
                    Misi Tonton Selesai!
                  </h3>
                  <p className="text-[11px] text-emerald-200 mt-1">
                    Klaim hadiah Anda sekarang untuk menambahkan koin gratis ke pundi-pundi saldo e-wallet Anda.
                  </p>
                  <button 
                    onClick={handleClaimAdReward}
                    className="w-full mt-3 py-2.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:brightness-110 font-black text-xs rounded-xl shadow-lg shadow-emerald-950 tracking-wider text-neutral-950 flex items-center justify-center gap-1 cursor-pointer animate-pulse"
                  >
                    <span>🎁 KLAIM +{rewardedCoinsPerAd.toLocaleString("id-ID")} KOIN SEKARANG</span>
                  </button>
                </motion.div>
              )}
            </div>

            {/* Ad Bottom Controller Footer */}
            <div className="bg-[#121212] p-4 flex flex-col gap-3.5 border-t border-neutral-900 shrink-0">
              {/* Animated Progress Bar */}
              <div>
                <div className="flex justify-between items-center mb-1 text-[10px] text-neutral-400 uppercase font-bold tracking-wider">
                  <span>Sisa Waktu Putar</span>
                  <span>{Math.round(((15 - adSecondsLeft) / 15) * 100)}%</span>
                </div>
                <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-500"
                    style={{ width: `${((15 - adSecondsLeft) / 15) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>

              {/* Mock Install CTA for maximum simulation realism */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-lg shadow-inner shrink-0">
                  {activeAdTopic === 0 ? "👑" : activeAdTopic === 1 ? "🍭" : "👾"}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-black text-white truncate">
                    {activeAdTopic === 0 ? "Royal Match" : activeAdTopic === 1 ? "Candy Jam Cash" : "Slither Worm Boost"}
                  </h4>
                  <p className="text-[10px] text-neutral-400 truncate leading-tight">
                    Didukung oleh Game Sponsor
                  </p>
                </div>
                
                <a 
                  href="https://play.google.com" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black transition-all active:scale-95 shadow-lg shadow-blue-900/20 uppercase tracking-widest text-center"
                >
                  Instal
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* REWARDS POPUP: WITHDRAW WALLET DIALOG */}
      <AnimatePresence>
        {showWithdrawModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (!withdrawalSuccess) setShowWithdrawModal(false); }}
              className="fixed inset-0 bg-black z-50"
            />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-[#15092a] border-2 border-purple-500/60 rounded-3xl p-6 z-50 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-mono leading-none">D</div>
                  Pencairan Saldo Dompet
                </h3>
                {!withdrawalSuccess && (
                  <button 
                    onClick={() => setShowWithdrawModal(false)}
                    className="w-7 h-7 rounded-full bg-purple-950 flex items-center justify-center hover:bg-purple-900 text-purple-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {!withdrawalSuccess ? (
                <form onSubmit={handleRequestWithdrawal}>
                  <p className="text-xs text-purple-200 mb-4 leading-relaxed">
                    Tukarkan kemenangan koin Anda menjadi saldo e-wallet asli! Konversi berlaku: <strong className="text-yellow-400">100 Koin = Rp 1</strong>. Minimal batas penarikan adalah <strong className="text-emerald-400">5.000.000 Koin</strong> (setara Rp 50.000).
                  </p>

                  <div className="bg-[#240f43] border border-purple-950 p-4 rounded-2xl mb-4 text-center">
                    <span className="text-[10px] text-purple-300 block uppercase font-bold">Koin Tersedia Anda</span>
                    <strong className="text-2xl font-extrabold text-yellow-400 block font-mono">
                      {danaBalance.toLocaleString("id-ID")} Koin
                    </strong>
                    <div className="mt-2 pt-2 border-t border-purple-950/40 text-xs text-emerald-400 font-bold">
                      Setara: Rp {Math.floor(danaBalance / 100).toLocaleString("id-ID")}
                    </div>
                    <span className="text-[9px] text-purple-400 mt-2 block">
                      {danaBalance >= 5000000 
                        ? "✅ Koin mencukupi untuk dicairkan!" 
                        : `❌ Butuh ${(5000000 - danaBalance).toLocaleString("id-ID")} Koin lagi untuk batas penarikan.`
                      }
                    </span>
                  </div>

                  <div className="mb-4">
                    <label className="block text-[10px] uppercase font-bold text-purple-300 mb-1">
                      Metode Penarikan
                    </label>
                    <select 
                      value={withdrawalWallet}
                      onChange={(e) => setWithdrawalWallet(e.target.value)}
                      className="w-full p-2.5 bg-[#251044] border border-[#521ca6]/40 rounded-xl text-xs text-white focus:ring-1 focus:ring-purple-400 focus:outline-none"
                    >
                      <option value="DANA E-Wallet">DANA E-Wallet</option>
                      <option value="GoPay Wallet">GoPay Wallet</option>
                      <option value="OVO Wallet">OVO Wallet</option>
                      <option value="LinkAja">LinkAja</option>
                    </select>
                  </div>

                  <div className="mb-6">
                    <label className="block text-[10px] uppercase font-bold text-purple-300 mb-1">
                      Nomor Handphone Terdaftar
                    </label>
                    <input 
                      type="tel" 
                      placeholder="Contoh: 081234567890" 
                      required
                      value={withdrawalPhone}
                      onChange={(e) => setWithdrawalPhone(e.target.value)}
                      className="w-full p-2.5 bg-[#251044] border border-[#521ca6]/40 rounded-xl text-xs text-white placeholder-purple-300/30 focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={danaBalance < 5000000}
                    className={`w-full py-3 rounded-xl font-bold text-xs tracking-wider transition-all shadow-md ${
                      danaBalance >= 5000000 
                        ? "bg-[#f59e0b] hover:bg-yellow-500 text-purple-950 cursor-pointer active:scale-95"
                        : "bg-purple-950 text-purple-400 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    KONVERSI & TARIK SALDO DANA
                  </button>
                </form>
              ) : (
                <div className="text-center py-6">
                  <div className="w-14 h-14 bg-emerald-950 border border-emerald-400 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                    <Coins className="w-8 h-8 text-yellow-300" />
                  </div>
                  <h4 className="text-sm font-extrabold text-emerald-400 mb-2">Penarikan Berhasil Dikirimkan!</h4>
                  <p className="text-xs text-purple-200 px-3">
                    Dana sebesar <strong className="text-white">Rp {claimAmount.toLocaleString("id-ID")}</strong> sedang diproses ke nomor <strong className="text-white">{withdrawalPhone}</strong> Anda. Waktu proses sekitar 1-5 menit.
                  </p>
                  <p className="text-[10px] text-purple-400 mt-4 italic font-medium">
                    Aplikasi otomatis menutup dialog ini dalam beberapa detik...
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* REWARDS POPUP: SECURED ADMIN PANEL DRAWER */}
      <AnimatePresence>
        {isAdminMode && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (!adminLoading) setIsAdminMode(false); }}
              className="fixed inset-0 bg-black/70 z-50 pointer-events-auto"
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-[#130626] border-2 border-purple-500/50 rounded-3xl p-5 z-50 shadow-2xl max-h-[85vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex justify-between items-center mb-4 border-b border-purple-900/30 pb-3">
                <h3 className="text-sm font-extrabold text-purple-300 flex items-center gap-1.5 font-display">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-ping"></span>
                  ⚙️ LISENSI & INTEGRASI SISTEM
                </h3>
                <button 
                  onClick={() => setIsAdminMode(false)}
                  className="w-7 h-7 rounded-full bg-purple-950 flex items-center justify-center hover:bg-purple-900 text-purple-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!isAdminLoggedIn ? (
                <div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[9px] uppercase font-extrabold text-purple-400 tracking-wider mb-1">
                        Kode Akses Verifikasi / Kunci Lisensi
                      </label>
                      <input 
                        type="password" 
                        placeholder="Masukkan kunci lisensi sistem" 
                        value={adminPasscode}
                        onChange={(e) => setAdminPasscode(e.target.value)}
                        className="w-full p-2.5 bg-[#251044] border border-[#521ca6]/40 rounded-xl text-xs text-white placeholder-purple-300/30 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
                      />
                    </div>
                    
                    <button
                      onClick={() => fetchAdminWithdrawals()}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all"
                    >
                      SINKRONKAN INTEGRASI
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4 bg-purple-950/50 border border-purple-950 p-2.5 rounded-xl">
                    <span className="text-[10px] text-emerald-400 font-bold">Lisensi Terverifikasi • Sinkron</span>
                    <button 
                      onClick={() => {
                        setIsAdminLoggedIn(false);
                        setAdminPasscode("");
                      }}
                      className="text-[10px] text-red-400 font-extrabold hover:underline"
                    >
                      Putuskan
                    </button>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[11px] font-bold text-purple-200 uppercase tracking-wider">
                      Antrean Pengajuan ({adminWithdrawals.length})
                    </h4>
                    <button 
                      onClick={() => fetchAdminWithdrawals()}
                      className="text-[9px] text-purple-300 bg-purple-950 px-2 py-1 rounded border border-purple-900 hover:text-white flex items-center gap-1 font-mono hover:scale-105 active:scale-95 transition-all"
                    >
                      🔁 Refresh list
                    </button>
                  </div>

                  {adminLoading ? (
                    <div className="py-8 flex flex-col items-center justify-center gap-1.5">
                      <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
                      <span className="text-[11px] text-purple-300">Memuat data...</span>
                    </div>
                  ) : adminWithdrawals.length === 0 ? (
                    <div className="text-center py-8 text-purple-400 text-xs">
                      Belum ada laporan pengajuan pencairan saat ini.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                      {adminWithdrawals.map((wd) => (
                        <div 
                          key={wd.id}
                          className="bg-[#240f43]/40 border border-[#521ca6]/30 rounded-xl p-3 flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-purple-400 font-bold">{wd.id}</span>
                            <span className={`text-[8.5px] font-extrabold px-1.5 py-0.5 rounded ${
                              wd.status === "Pending" ? "bg-amber-950/60 text-amber-400 border border-amber-500/30" :
                              wd.status === "Disetujui" ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/30" :
                              "bg-red-950/60 text-red-500 border border-red-500/30"
                            }`}>
                              {wd.status}
                            </span>
                          </div>

                          <div className="flex justify-between items-start">
                            <div>
                              <strong className="block text-xs text-white font-mono">{wd.phone}</strong>
                              <span className="block text-[9.5px] text-purple-300 font-semibold">{wd.walletType}</span>
                              <span className="block text-[8.5px] text-purple-400 font-mono mt-0.5">
                                {new Date(wd.timestamp).toLocaleString("id-ID", { hour: "numeric", minute: "numeric", day: "numeric", month: "short" })}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="block text-[8.5px] text-purple-400">Total Cair</span>
                              <strong className="text-xs font-black text-emerald-400 font-mono">
                                Rp {wd.amount.toLocaleString("id-ID")}
                              </strong>
                            </div>
                          </div>

                          {/* Action decision tools */}
                          {wd.status === "Pending" && (
                            <div className="flex gap-2 border-t border-purple-900/20 pt-2 mt-1">
                              <button
                                onClick={() => handleUpdateStatus(wd.id, "Disetujui")}
                                className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-white text-[10px] font-bold active:scale-[0.98] transition-all"
                              >
                                Setujui (Kirim Dana)
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(wd.id, "Ditolak")}
                                className="px-2 py-1 bg-red-950/60 hover:bg-red-900 text-red-400 rounded text-[10px] font-bold active:scale-[0.98] transition-all"
                              >
                                Tolak
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-5 border-t border-purple-900/40 pt-4 pb-1">
                    <h4 className="text-[11px] font-bold text-purple-200 uppercase tracking-wider mb-2 flex items-center gap-1.5 font-display">
                      ⚙️ PENGATURAN DISPENSASI KOIN
                    </h4>
                    
                    <div className="space-y-3 bg-[#240f43]/40 border border-[#521ca6]/30 rounded-xl p-3">
                      <div>
                        <span className="block text-[10px] text-purple-300 font-bold mb-1">
                          Hadiah Main Game (Rentang Koin)
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[8px] text-purple-400 font-bold uppercase tracking-wide">Min (Koin)</label>
                            <input 
                              type="number"
                              value={rewardMin || ""}
                              onChange={(e) => setRewardMin(Math.max(0, parseInt(e.target.value, 10) || 0))}
                              className="w-full p-2 bg-[#120525] border border-purple-500/20 rounded-lg text-xs text-yellow-400 font-black font-mono focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] text-purple-400 font-bold uppercase tracking-wide">Max (Koin)</label>
                            <input 
                              type="number"
                              value={rewardMax || ""}
                              onChange={(e) => setRewardMax(Math.max(0, parseInt(e.target.value, 10) || 0))}
                              className="w-full p-2 bg-[#120525] border border-purple-500/20 rounded-lg text-xs text-yellow-400 font-black font-mono focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
                            />
                          </div>
                        </div>
                        <p className="text-[8px] text-purple-400/80 mt-1.5 leading-relaxed">
                          Pemain akan menerima hadiah Koin acak dari rentang minimum hingga maksimum yang Anda tentukan di atas. Tentukan koin lebih kecil (misal: 1000 hingga 10000 koin) agar tidak terlalu boros. Konversi: 100 Koin = Rp 1.
                        </p>
                      </div>

                      <div className="border-t border-purple-900/30 pt-3">
                        <label className="block text-[10px] text-purple-300 font-bold mb-1">
                          Hadiah Roda Keberuntungan (8 Sektor - Koin)
                        </label>
                        <input 
                          type="text"
                          value={wheelInput}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setWheelInput(raw);
                            const parsed = raw.split(",").map(val => parseInt(val.trim(), 10) || 0);
                            if (parsed.length === 8 && !parsed.some(isNaN)) {
                              setWheelRewards(parsed);
                            }
                          }}
                          placeholder="Misal: 120000, 25000, 80000, 15000, 50000, 30000, 100000, 10000"
                          className="w-full p-2 bg-[#120525] border border-purple-500/20 rounded-lg text-xs text-yellow-400 font-mono tracking-wider focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
                        />
                        <p className="text-[8px] text-purple-400/80 mt-1.5 leading-relaxed">
                          Masukkan 8 angka hadiah Koin dipisahkan dengan koma untuk masing-masing sektor papan roda keberuntungan. Gunakan angka di bawah 100000 koin agar hadiah lebih terkontrol.
                        </p>
                      </div>

                      {/* DANA KAGET PROMOTION SETTING */}
                      <div className="border-t border-purple-900/30 pt-3">
                        <label className="block text-[10px] text-purple-300 font-bold mb-1 flex items-center gap-1">
                          🎁 Bagikan Dana Kaget ke Seluruh User
                        </label>
                        <div className="space-y-2">
                          <input 
                            type="text"
                            value={adminDanaKagetInput}
                            onChange={(e) => setAdminDanaKagetInput(e.target.value)}
                            placeholder="Link DANA Kaget (https://link.dana.id/...)"
                            className="w-full p-2 bg-[#120525] border border-purple-500/20 rounded-lg text-xs text-teal-300 placeholder-purple-400/30 font-mono tracking-wide focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleShareDanaKaget}
                              className="flex-1 py-1.5 bg-gradient-to-r from-[#10b981] to-[#059669] hover:brightness-110 text-white font-extrabold text-[10px] rounded-lg shadow-md transition-all active:scale-[0.98] cursor-pointer"
                            >
                              🚀 KIRIM SEKARANG
                            </button>
                            {danaKagetLink && (
                              <button
                                onClick={handleDeleteDanaKaget}
                                className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 border border-red-500/30 text-red-400 text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                              >
                                HAPUS
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-[8px] text-purple-400/80 mt-1.5 leading-relaxed">
                          Bagikan link DANA Kaget langsung ke halaman dashboard seluruh pemain secara real-time. Untuk menghentikan distibusi link, klik "HAPUS".
                        </p>
                      </div>

                      {/* UNITY ADS ADVERTISING SETTING */}
                      <div className="border-t border-purple-900/30 pt-3">
                        <label className="block text-[10px] text-purple-300 font-bold mb-1 flex items-center gap-1">
                          📡 Integrasi Unity Ads SDK (APK Monetisasi)
                        </label>
                        <div className="space-y-2">
                          <div>
                            <label className="block text-[8px] text-purple-400 font-bold uppercase tracking-wide">Unity Game ID (Android)</label>
                            <input 
                              type="text"
                              value={unityAdsGameId}
                              onChange={(e) => {
                                const val = e.target.value;
                                setUnityAdsGameId(val);
                                localStorage.setItem("unity_ads_game_id", val);
                              }}
                              placeholder="Contoh: 6289410"
                              className="w-full p-2 bg-[#120525] border border-purple-500/20 rounded-lg text-xs text-purple-300 font-mono tracking-wide focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[8px] text-purple-400 font-bold uppercase tracking-wide">Ad Unit ID</label>
                              <input 
                                type="text"
                                value={unityRewardedAdUnit}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setUnityRewardedAdUnit(val);
                                  localStorage.setItem("unity_rewarded_ad_unit", val);
                                }}
                                placeholder="Rewarded_Android"
                                className="w-full p-2 bg-[#120525] border border-purple-500/20 rounded-lg text-xs text-purple-300 font-mono focus:border-purple-400' focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] text-purple-400 font-bold uppercase tracking-wide">Reward (Koin)</label>
                              <input 
                                type="number"
                                value={rewardedCoinsPerAd}
                                onChange={(e) => {
                                  const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                  setRewardedCoinsPerAd(val);
                                  localStorage.setItem("unity_rewarded_coins", val.toString());
                                }}
                                placeholder="150000"
                                className="w-full p-2 bg-[#120525] border border-purple-500/20 rounded-lg text-xs text-yellow-400 font-mono font-bold"
                              />
                            </div>
                          </div>
                        </div>
                        <p className="text-[8px] text-purple-400/80 mt-1.5 leading-relaxed">
                          Masukkan <strong>Game ID Android</strong> yang tertera pada dashboard Unity Cloud Anda (seperti screenshot Anda). Kode ini menghubungkan tombol "Tonton Video" ke unit iklan asli milik Anda saat dibuild menjadi file APK Android.
                        </p>
                      </div>

                      {/* API SERVER CONNECTION SETTING */}
                      <div className="border-t border-purple-900/30 pt-3">
                        <label className="block text-[10px] text-purple-300 font-bold mb-1 flex items-center gap-1">
                          📡 Domain / Host API Server (Untuk APK Android)
                        </label>
                        <input 
                          type="text"
                          value={apiHost}
                          onChange={(e) => {
                            const val = e.target.value.trim();
                            setApiHost(val);
                            localStorage.setItem("pusat_game_api_host", val);
                          }}
                          placeholder="https://..."
                          className="w-full p-2 bg-[#120525] border border-purple-500/20 rounded-lg text-xs text-blue-300 font-mono tracking-wide focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
                        />
                        <p className="text-[8px] text-purple-400/80 mt-1.5 leading-relaxed">
                          Masukkan URL backend real-time server web produksi tempat endpoint kueri game disimpan. Secara default disinkronkan ke AI Studio Cloud Run Engine Anda.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-purple-900/40 pt-4">
                    <button
                      onClick={() => setShowPasswordChangeGroup(!showPasswordChangeGroup)}
                      className="w-full py-1.5 px-3 rounded-lg bg-purple-950/40 hover:bg-purple-950/80 text-purple-300 hover:text-white font-bold text-[9px] uppercase tracking-wider border border-purple-800/20 flex items-center justify-between transition-all cursor-pointer"
                    >
                      <span>{showPasswordChangeGroup ? "🔒 Tutup Ubah Sandi Akses" : "🔑 Ubah Sandi Akses Lisensi"}</span>
                      <span>{showPasswordChangeGroup ? "▲" : "▼"}</span>
                    </button>

                    {showPasswordChangeGroup && (
                      <div className="mt-2 bg-[#240f43]/40 border border-[#521ca6]/30 rounded-xl p-3 space-y-2">
                        <div>
                          <label className="block text-[8px] text-purple-400 mb-1 font-bold uppercase tracking-wide">Sandi Akses Baru</label>
                          <input 
                            type="password"
                            placeholder="Min. 4 karakter"
                            value={newAdminPasscode}
                            onChange={(e) => setNewAdminPasscode(e.target.value)}
                            className="w-full p-2 bg-[#120525] border border-purple-500/20 rounded-lg text-xs text-white placeholder-purple-400/30 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400 font-mono"
                          />
                        </div>
                        <button
                          onClick={handleChangePassword}
                          className="w-full py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white font-extrabold text-[10px] rounded-lg shadow-md transition-all active:scale-[0.98] cursor-pointer"
                        >
                          Simpan Sandi Baru
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-[9px] text-center text-purple-300 leading-relaxed bg-purple-950/30 p-2.5 rounded-lg border border-purple-900/20 mt-4">
                    ℹ️ Permintaan di atas tersimpan aman di Express server. Anda dapat mengirimkan dana manual menggunakan akun e-wallet Anda ke nomor tujuan terkait, kemudian tekan tombol <strong>"Setujui"</strong> untuk menyelesaikannya.
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* FLOATING ACTIVE BONUS TOAST */}
      <AnimatePresence>
        {showActiveBonusToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm bg-gradient-to-r from-emerald-600 to-teal-600 border border-emerald-400 rounded-2xl p-4 shadow-2xl flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-950 flex items-center justify-center text-xl shrink-0 shadow-inner animate-bounce">
              🎁
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Bonus Keaktifan!
              </h4>
              <p className="text-[11px] text-emerald-100 mt-0.5 leading-snug">
                Selamat! Anda mendapatkan <strong className="text-yellow-300 font-extrabold">+500 Koin</strong> karena telah aktif bermain selama 5 menit.
              </p>
            </div>
            <button 
              onClick={() => setShowActiveBonusToast(false)}
              className="text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
