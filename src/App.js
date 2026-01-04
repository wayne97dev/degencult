import React, { useState, useRef, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

// ═══════════════════════════════════════════════════════════════
// 🔥 FIREBASE CONFIGURATION
// ═══════════════════════════════════════════════════════════════
const firebaseConfig = {
  apiKey: "AIzaSyCK3N54-FOioy2246jNUZ8N-JSCIiJxyjs",
  authDomain: "degen-cult.firebaseapp.com",
  projectId: "degen-cult",
  storageBucket: "degen-cult.firebasestorage.app",
  messagingSenderId: "676768816506",
  appId: "1:676768816506:web:eeed1eb5432ce46af68ac3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// ═══════════════════════════════════════════════════════════════

const App = () => {
  const canvasRef = useRef(null);
  const [bg, setBg] = useState('sky');
  const [skinColor, setSkinColor] = useState('#ff68b4');
  const [hairStyle, setHairStyle] = useState('spiky');
  const [hairColor, setHairColor] = useState('#22cc55');
  const [eyeStyle, setEyeStyle] = useState('default');
  const [mouthStyle, setMouthStyle] = useState('neutral');
  const [accessory, setAccessory] = useState(null);
  const [hat, setHat] = useState(null);
  const [item, setItem] = useState(null);
  const [effect, setEffect] = useState(null);
  
  const [showCard, setShowCard] = useState(false);
  const [mintPreviewImage, setMintPreviewImage] = useState(null);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [showBotDashboard, setShowBotDashboard] = useState(false);
  const [botBalance, setBotBalance] = useState(null);
  const [botTransactions, setBotTransactions] = useState([]);
  const [botLoading, setBotLoading] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [sellPrice, setSellPrice] = useState('');
  const [animEnabled, setAnimEnabled] = useState(true);
  const [animFrame, setAnimFrame] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [generatedLore, setGeneratedLore] = useState('');
  const [mintedNFTs, setMintedNFTs] = useState([]);
  const [mintError, setMintError] = useState('');
  const [mintSuccess, setMintSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isMinting, setIsMinting] = useState(false);
  const [viewMode, setViewMode] = useState('all');
  const [copied, setCopied] = useState(false);

  // ═══════════════════════════════════════════════════════════════
  // ⚙️ CONFIGURAZIONE - MODIFICA QUI I TUOI LINK!
  // ═══════════════════════════════════════════════════════════════
  const CONFIG = {
    TWITTER_URL: "https://x.com/YOUR_TWITTER_HERE",
    DEXSCREENER_URL: "https://dexscreener.com/solana/YOUR_TOKEN_HERE",
    CONTRACT_ADDRESS: "YOUR_CONTRACT_ADDRESS_HERE",
    // 💰 WALLET & FEES CONFIG
    FEE_WALLET: "YOUR_SOLANA_WALLET_HERE", // Il tuo wallet per ricevere fee e mint
    FEE_PERCENT: 2.5, // Percentuale fee sulle vendite (2.5%)
    MINT_PRICE: 0.05, // Costo per mintare un NFT in SOL
    // 🤖 BOT CONFIG
    BOT_WALLET: "YOUR_BOT_WALLET_HERE", // Wallet del bot MM (stesso di FEE_WALLET)
    TOKEN_ADDRESS: "YOUR_TOKEN_ADDRESS_HERE", // Indirizzo del tuo token
  };
  // ═══════════════════════════════════════════════════════════════

  // 🔗 Solana Connection (Mainnet)
  // Per RPC dedicato e più veloce, registrati gratis su helius.dev
  const SOLANA_RPC = "https://solana.publicnode.com";
  const connection = new Connection(SOLANA_RPC, 'confirmed');

  // ═══════════════════════════════════════════════════════════════
  // 🤖 BOT DASHBOARD FUNCTIONS
  // ═══════════════════════════════════════════════════════════════
  
  // Fetch bot wallet balance
  const fetchBotBalance = async () => {
    if (!CONFIG.BOT_WALLET || CONFIG.BOT_WALLET === "YOUR_BOT_WALLET_HERE") return;
    
    try {
      const pubkey = new PublicKey(CONFIG.BOT_WALLET);
      const balance = await connection.getBalance(pubkey);
      setBotBalance(balance / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error('Error fetching bot balance:', error);
    }
  };

  // Fetch recent transactions
  const fetchBotTransactions = async () => {
    if (!CONFIG.BOT_WALLET || CONFIG.BOT_WALLET === "YOUR_BOT_WALLET_HERE") return;
    
    setBotLoading(true);
    try {
      const pubkey = new PublicKey(CONFIG.BOT_WALLET);
      const signatures = await connection.getSignaturesForAddress(pubkey, { limit: 20 });
      
      const txDetails = await Promise.all(
        signatures.slice(0, 10).map(async (sig) => {
          try {
            const tx = await connection.getParsedTransaction(sig.signature, {
              maxSupportedTransactionVersion: 0
            });
            
            // Determine if it's a buy or sell based on SOL movement
            let type = 'UNKNOWN';
            let amount = 0;
            
            if (tx?.meta) {
              const preBalance = tx.meta.preBalances[0] || 0;
              const postBalance = tx.meta.postBalances[0] || 0;
              const diff = (postBalance - preBalance) / LAMPORTS_PER_SOL;
              
              if (diff > 0.001) {
                type = 'SELL';
                amount = Math.abs(diff);
              } else if (diff < -0.001) {
                type = 'BUY';
                amount = Math.abs(diff);
              } else {
                type = 'TRANSFER';
                amount = Math.abs(diff);
              }
            }
            
            return {
              signature: sig.signature,
              type,
              amount: amount.toFixed(4),
              time: sig.blockTime ? new Date(sig.blockTime * 1000) : new Date(),
              status: sig.err ? 'FAILED' : 'SUCCESS'
            };
          } catch (e) {
            return null;
          }
        })
      );
      
      setBotTransactions(txDetails.filter(tx => tx !== null));
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
    setBotLoading(false);
  };

  // Load bot data when dashboard opens
  useEffect(() => {
    if (showBotDashboard) {
      fetchBotBalance();
      fetchBotTransactions();
    }
  }, [showBotDashboard]);

  // Auto-refresh bot data every 30 seconds
  useEffect(() => {
    if (!showBotDashboard) return;
    
    const interval = setInterval(() => {
      fetchBotBalance();
      fetchBotTransactions();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [showBotDashboard]);

  // Format time ago
  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Wallet State
  const [walletAddress, setWalletAddress] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletError, setWalletError] = useState('');

  const P = 5;

  // Copy contract address
  const copyContract = () => {
    navigator.clipboard.writeText(CONFIG.CONTRACT_ADDRESS);
    setCopied(true);
    playSound('select');
    setTimeout(() => setCopied(false), 2000);
  };

  // ═══════════════════════════════════════════════════════════════
  // 🔥 FIREBASE FUNCTIONS
  // ═══════════════════════════════════════════════════════════════
  
  // Load NFTs from Firebase (real-time)
  useEffect(() => {
    setIsLoading(true);
    const nftsRef = collection(db, 'nfts');
    const q = query(nftsRef, orderBy('mintedAt', 'desc'));
    
    // Real-time listener
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const nfts = [];
      snapshot.forEach((doc) => {
        nfts.push({ id: doc.id, ...doc.data() });
      });
      setMintedNFTs(nfts);
      setIsLoading(false);
    }, (error) => {
      console.error('Error loading NFTs:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Save NFT to Firebase
  const saveNFTToFirebase = async (nftData) => {
    try {
      const docRef = await addDoc(collection(db, 'nfts'), nftData);
      return docRef.id;
    } catch (error) {
      console.error('Error saving NFT:', error);
      throw error;
    }
  };

  // Update NFT in Firebase (for selling/buying)
  const updateNFTInFirebase = async (nftId, updates) => {
    try {
      const nftRef = doc(db, 'nfts', nftId);
      await updateDoc(nftRef, updates);
    } catch (error) {
      console.error('Error updating NFT:', error);
      throw error;
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // 🔧 PHANTOM WALLET
  // ═══════════════════════════════════════════════════════════════
  const getPhantomProvider = () => {
    if (typeof window !== 'undefined') {
      if (window.phantom?.solana?.isPhantom) {
        return window.phantom.solana;
      }
      if (window.solana?.isPhantom) {
        return window.solana;
      }
    }
    return null;
  };

  const connectWallet = async () => {
    setWalletError('');
    setIsConnecting(true);
    
    try {
      const provider = getPhantomProvider();
      
      if (!provider) {
        const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobileDevice) {
          const currentUrl = encodeURIComponent(window.location.href);
          window.location.href = `https://phantom.app/ul/browse/${currentUrl}`;
          setIsConnecting(false);
          return;
        }
        setWalletError('Phantom not found! Install from phantom.app');
        setIsConnecting(false);
        return;
      }

      const response = await provider.connect();
      const address = response.publicKey.toString();
      setWalletAddress(address);
      playSound('mint');
      localStorage.setItem('pfpWallet', address);
    } catch (err) {
      console.error('Wallet error:', err);
      if (err.code === 4001 || err.message?.includes('User rejected')) {
        setWalletError('Connection rejected by user');
      } else {
        setWalletError('Refresh the page and try again');
      }
    }
    
    setIsConnecting(false);
  };

  const disconnectWallet = async () => {
    try {
      const provider = getPhantomProvider();
      if (provider) {
        await provider.disconnect();
      }
    } catch (err) {}
    setWalletAddress(null);
    localStorage.removeItem('pfpWallet');
    playSound('click');
  };

  useEffect(() => {
    const checkWallet = async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      const savedWallet = localStorage.getItem('pfpWallet');
      const provider = getPhantomProvider();
      
      if (provider && savedWallet) {
        try {
          const response = await provider.connect({ onlyIfTrusted: true });
          setWalletAddress(response.publicKey.toString());
        } catch (err) {
          localStorage.removeItem('pfpWallet');
        }
      }
    };
    checkWallet();
  }, []);

  // Generate unique hash for current config
  const getConfigHash = () => {
    return `${bg}-${skinColor}-${hairStyle}-${hairColor}-${eyeStyle}-${mouthStyle}-${accessory}-${hat}-${item}-${effect}`;
  };

  // Check if current config is already minted
  const isAlreadyMinted = () => {
    return mintedNFTs.some(nft => nft.hash === getConfigHash());
  };

  const shortAddress = (addr) => {
    if (!addr) return '';
    return addr.slice(0, 4) + '...' + addr.slice(-4);
  };

  // Sound System
  const audioCtx = useRef(null);
  const playSound = (type) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtx.current;
      const sounds = {
        click: { freq: 800, dur: 0.05 },
        select: { freq: 1200, dur: 0.08 },
        special: { freq: 600, dur: 0.15 },
        mint: { freq: [523, 659, 784, 1047], dur: 0.15 },
        error: { freq: 200, dur: 0.3 },
      };
      const s = sounds[type] || sounds.click;
      
      if (Array.isArray(s.freq)) {
        s.freq.forEach((f, i) => {
          setTimeout(() => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'square'; osc.frequency.value = f;
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + s.dur);
            osc.start(); osc.stop(ctx.currentTime + s.dur);
          }, i * 80);
        });
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'square'; osc.frequency.value = s.freq;
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + s.dur);
        osc.start(); osc.stop(ctx.currentTime + s.dur);
      }
    } catch (e) {}
  };

  // Rarity System
  const rarities = {
    common: { name: 'Common', color: '#9e9e9e', score: 10 },
    uncommon: { name: 'Uncommon', color: '#4caf50', score: 25 },
    rare: { name: 'Rare', color: '#2196f3', score: 50 },
    epic: { name: 'Epic', color: '#9c27b0', score: 100 },
    legendary: { name: 'Legendary', color: '#ff9800', score: 200 },
    mythic: { name: 'Mythic', color: '#f44336', score: 500 },
  };

  const traitRarities = {
    backgrounds: { sky: 'common', sunset: 'uncommon', night: 'rare', matrix: 'epic', vaporwave: 'rare', fire: 'epic', ocean: 'uncommon', forest: 'common', pink: 'common', gold: 'legendary', space: 'epic', btc: 'legendary' },
    hairStyles: { spiky: 'common', mohawk: 'uncommon', long: 'common', afro: 'uncommon', punk: 'rare', bowl: 'common', anime: 'rare', curly: 'uncommon', pigtails: 'uncommon', bald: 'common' },
    eyeStyles: { default: 'common', cute: 'uncommon', angry: 'common', happy: 'common', sad: 'common', heart: 'rare', star: 'epic', money: 'rare', dead: 'uncommon', wink: 'uncommon', laser: 'legendary' },
    mouthStyles: { neutral: 'common', smile: 'common', big_smile: 'uncommon', frown: 'common', open: 'common', teeth: 'uncommon', tongue: 'uncommon', cat: 'rare', fangs: 'rare' },
    accessories: { sunglasses: 'uncommon', thug: 'rare', glasses: 'common', monocle: 'epic', eyepatch: 'rare', blush: 'common', scar: 'rare' },
    hats: { cap: 'common', crown: 'legendary', halo: 'epic', horns: 'epic', headphones: 'uncommon', wizard: 'rare', cowboy: 'uncommon', beanie: 'common', tophat: 'rare', party: 'uncommon', cat_ears: 'rare', bunny_ears: 'rare', antenna: 'epic' },
    items: { joint: 'uncommon', chain: 'rare', money: 'rare', coffee: 'common', phone: 'common', sword: 'epic', rose: 'uncommon', pizza: 'common', controller: 'uncommon' },
    effects: { sparkle: 'uncommon', hearts: 'uncommon', fire: 'rare', money_rain: 'epic', tears: 'common', rage: 'uncommon', sleep: 'common', music: 'uncommon', lightning: 'rare', snow: 'uncommon' },
  };

  const getRarityScore = (config = null) => {
    const c = config || { bg, hairStyle, eyeStyle, mouthStyle, accessory, hat, item, effect };
    const getScore = (category, value) => {
      if (!value) return 10;
      const r = traitRarities[category]?.[value] || 'common';
      return rarities[r].score;
    };
    return getScore('backgrounds', c.bg) + getScore('hairStyles', c.hairStyle) + getScore('eyeStyles', c.eyeStyle) + 
           getScore('mouthStyles', c.mouthStyle) + getScore('accessories', c.accessory) + getScore('hats', c.hat) + 
           getScore('items', c.item) + getScore('effects', c.effect);
  };

  const getOverallRarity = (score = null) => {
    const s = score || getRarityScore();
    if (s >= 600) return 'mythic';
    if (s >= 400) return 'legendary';
    if (s >= 250) return 'epic';
    if (s >= 150) return 'rare';
    if (s >= 100) return 'uncommon';
    return 'common';
  };

  // Lore Generator
  const generateLore = () => {
    const names = ['0xChad', 'PixelPunk', 'MoonBoi', 'DiamondApe', 'GigaBrain', 'CryptoKing', 'DegenLord', 'RugSurvivor', 'WenLambo', 'NgmiNpc'];
    const suffixes = ['420', '69', '1337', 'SOL', 'APE', 'MOON', 'WAGMI'];
    const origins = ['Emerged from the blockchain', 'Spawned in a Discord server', 'Born during a rug pull', 'Created in a failed mint'];
    const traits = ['Diamond hands certified 💎', 'Professional bag holder 💼', 'Rug pull survivor (x3) 🏃', 'Never sold the bottom 📉', 'Touch grass? Never 🌿'];
    const goals = ['Seeking the next 100x 🚀', 'Waiting for alt season ⏳', 'Building in the bear 🐻', 'Farming airdrops 🌾'];
    
    const name = names[Math.floor(Math.random() * names.length)] + suffixes[Math.floor(Math.random() * suffixes.length)];
    const lore = `【 ${name} 】\n\n${origins[Math.floor(Math.random() * origins.length)]} in ${2020 + Math.floor(Math.random() * 5)}.\n\n✦ ${traits[Math.floor(Math.random() * traits.length)]}\n✦ ${traits[Math.floor(Math.random() * traits.length)]}\n\n${goals[Math.floor(Math.random() * goals.length)]}\n\nScore: ${getRarityScore()}`;
    setGeneratedLore(lore);
    playSound('special');
  };

  // Presets
  const presets = {
    crypto_bro: { name: '💰 Crypto', bg: 'btc', hairStyle: 'spiky', hairColor: '#ffdd22', eyeStyle: 'money', mouthStyle: 'big_smile', hat: 'cap', item: 'chain', effect: 'money_rain', accessory: 'sunglasses', skinColor: '#ffddaa' },
    anime: { name: '🌸 Anime', bg: 'pink', hairStyle: 'pigtails', hairColor: '#ff44aa', eyeStyle: 'cute', mouthStyle: 'cat', hat: 'cat_ears', accessory: 'blush', effect: 'sparkle', skinColor: '#ffddaa' },
    goblin: { name: '👺 Goblin', bg: 'forest', hairStyle: 'mohawk', hairColor: '#333333', eyeStyle: 'angry', mouthStyle: 'teeth', hat: 'horns', accessory: 'scar', effect: 'rage', skinColor: '#77ff77' },
    wizard: { name: '🧙 Wizard', bg: 'space', hairStyle: 'long', hairColor: '#eeeeee', eyeStyle: 'star', mouthStyle: 'smile', hat: 'wizard', effect: 'lightning', skinColor: '#dd88ff' },
    party: { name: '🎉 Party', bg: 'vaporwave', hairStyle: 'punk', hairColor: '#ff44aa', eyeStyle: 'star', mouthStyle: 'tongue', hat: 'party', effect: 'sparkle', item: 'controller', skinColor: '#ff68b4' },
  };

  const applyPreset = (id) => {
    const p = presets[id];
    setBg(p.bg); setHairStyle(p.hairStyle); setHairColor(p.hairColor);
    setEyeStyle(p.eyeStyle); setMouthStyle(p.mouthStyle); setSkinColor(p.skinColor);
    setHat(p.hat || null); setAccessory(p.accessory || null);
    setItem(p.item || null); setEffect(p.effect || null);
    playSound('special');
  };

  // Data
  const backgrounds = {
    sky: { name: '☁️ Sky', color: '#55aaee' },
    sunset: { name: '🌅 Sunset', gradient: ['#ff7b54', '#ffd56b'] },
    night: { name: '🌙 Night', color: '#1a1a3e', stars: true },
    matrix: { name: '💚 Matrix', color: '#001100', matrix: true },
    vaporwave: { name: '💜 Vapor', gradient: ['#ff71ce', '#01cdfe'], grid: true },
    fire: { name: '🔥 Fire', gradient: ['#1a0000', '#ff4400'] },
    ocean: { name: '🌊 Ocean', gradient: ['#001a33', '#0066aa'] },
    forest: { name: '🌲 Forest', color: '#1a472a' },
    pink: { name: '💗 Pink', color: '#ffb6c1' },
    gold: { name: '✨ Gold', gradient: ['#ffd700', '#ff8800'] },
    space: { name: '🚀 Space', color: '#0a0a1a', nebula: true },
    btc: { name: '₿ BTC', color: '#f7931a' },
  };

  const skinColors = [
    { color: '#ff68b4' }, { color: '#ffddaa' }, { color: '#ffcc88' }, { color: '#dd9966' },
    { color: '#ffff77' }, { color: '#77ddff' }, { color: '#77ff77' }, { color: '#dd88ff' },
  ];

  const hairColors = [
    { color: '#22cc55' }, { color: '#ff44aa' }, { color: '#4499ff' }, { color: '#ffdd22' },
    { color: '#ff4444' }, { color: '#aa44ff' }, { color: '#ff8822' }, { color: '#22dddd' },
    { color: '#eeeeee' }, { color: '#333333' },
  ];

  const hairStyles = [
    { id: 'spiky', name: '⚡ Spiky' }, { id: 'mohawk', name: '🦅 Mohawk' },
    { id: 'long', name: '💇 Long' }, { id: 'afro', name: '🌀 Afro' },
    { id: 'punk', name: '🎸 Punk' }, { id: 'bowl', name: '🍄 Bowl' },
    { id: 'anime', name: '✨ Anime' }, { id: 'curly', name: '🌊 Curly' },
    { id: 'pigtails', name: '🎀 Pigtails' }, { id: 'bald', name: '🥚 Bald' },
  ];

  const eyeStyles = [
    { id: 'default', name: 'Normal' }, { id: 'cute', name: '🥺 Cute' },
    { id: 'angry', name: '😠 Angry' }, { id: 'happy', name: '😊 Happy' },
    { id: 'sad', name: '😢 Sad' }, { id: 'heart', name: '😍 Hearts' },
    { id: 'star', name: '🤩 Stars' }, { id: 'money', name: '🤑 Money' },
    { id: 'dead', name: '💀 Dead' }, { id: 'wink', name: '😉 Wink' },
    { id: 'laser', name: '👁️ Laser' },
  ];

  const mouthStyles = [
    { id: 'neutral', name: 'Neutral' }, { id: 'smile', name: '😊 Smile' },
    { id: 'big_smile', name: '😄 Big' }, { id: 'frown', name: '☹️ Frown' },
    { id: 'open', name: '😮 Open' }, { id: 'teeth', name: '😬 Teeth' },
    { id: 'tongue', name: '😛 Tongue' }, { id: 'cat', name: '😺 Cat' },
    { id: 'fangs', name: '🧛 Fangs' },
  ];

  const accessories = [
    { id: null, name: 'None' }, { id: 'sunglasses', name: '😎 Shades' },
    { id: 'thug', name: '🕶️ Thug' }, { id: 'glasses', name: '🤓 Glasses' },
    { id: 'monocle', name: '🧐 Monocle' }, { id: 'eyepatch', name: '🏴‍☠️ Patch' },
    { id: 'blush', name: '☺️ Blush' }, { id: 'scar', name: '⚔️ Scar' },
  ];

  const hats = [
    { id: null, name: 'None' }, { id: 'cap', name: '🧢 Cap' },
    { id: 'crown', name: '👑 Crown' }, { id: 'halo', name: '😇 Halo' },
    { id: 'horns', name: '😈 Horns' }, { id: 'headphones', name: '🎧 Phones' },
    { id: 'wizard', name: '🧙 Wizard' }, { id: 'cowboy', name: '🤠 Cowboy' },
    { id: 'beanie', name: '🎿 Beanie' }, { id: 'tophat', name: '🎩 Tophat' },
    { id: 'party', name: '🎉 Party' }, { id: 'antenna', name: '👽 Alien' },
  ];

  const items = [
    { id: null, name: 'None' }, { id: 'joint', name: '🚬 Joint' },
    { id: 'chain', name: '⛓️ Chain' }, { id: 'money', name: '💵 Money' },
    { id: 'coffee', name: '☕ Coffee' }, { id: 'phone', name: '📱 Phone' },
    { id: 'sword', name: '⚔️ Sword' }, { id: 'rose', name: '🌹 Rose' },
    { id: 'pizza', name: '🍕 Pizza' }, { id: 'controller', name: '🎮 Game' },
  ];

  const effects = [
    { id: null, name: 'None' }, { id: 'sparkle', name: '✨ Sparkle' },
    { id: 'hearts', name: '💕 Hearts' }, { id: 'fire', name: '🔥 Fire' },
    { id: 'money_rain', name: '💸 Money' }, { id: 'tears', name: '😢 Tears' },
    { id: 'rage', name: '💢 Rage' }, { id: 'sleep', name: '💤 Zzz' },
    { id: 'music', name: '🎵 Music' }, { id: 'lightning', name: '⚡ Bolt' },
    { id: 'snow', name: '❄️ Snow' },
  ];

  // Drawing helpers
  const px = (ctx, x, y, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x / P) * P, Math.round(y / P) * P, P, P);
  };

  const pxRect = (ctx, x, y, w, h, color) => {
    ctx.fillStyle = color;
    for (let py = 0; py < h; py += P) {
      for (let pxx = 0; pxx < w; pxx += P) {
        ctx.fillRect(Math.round((x + pxx) / P) * P, Math.round((y + py) / P) * P, P, P);
      }
    }
  };

  const darken = (hex, amt = 40) => {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.max(0, (num >> 16) - amt);
    const g = Math.max(0, ((num >> 8) & 0xff) - amt);
    const b = Math.max(0, (num & 0xff) - amt);
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
  };

  const lighten = (hex, amt = 40) => {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.min(255, (num >> 16) + amt);
    const g = Math.min(255, ((num >> 8) & 0xff) + amt);
    const b = Math.min(255, (num & 0xff) + amt);
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
  };

  // Animation
  useEffect(() => {
    if (!animEnabled) return;
    const interval = setInterval(() => setAnimFrame(f => (f + 1) % 60), 100);
    return () => clearInterval(interval);
  }, [animEnabled]);

  // Draw avatar
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2 + 15;

    ctx.clearRect(0, 0, W, H);

    const bgData = backgrounds[bg];
    if (bgData.gradient) {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      bgData.gradient.forEach((col, i) => grad.addColorStop(i / (bgData.gradient.length - 1), col));
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = bgData.color;
    }
    ctx.fillRect(0, 0, W, H);

    if (bgData.stars) {
      for (let i = 0; i < 40; i++) {
        ctx.globalAlpha = 0.5 + Math.sin((animFrame + i * 10) * 0.2) * 0.3;
        px(ctx, (i * 37) % W, (i * 23) % H, '#fff');
      }
      ctx.globalAlpha = 1;
    }
    if (bgData.matrix) {
      ctx.fillStyle = '#00ff00';
      ctx.font = `${P * 2}px monospace`;
      for (let x = 0; x < W; x += P * 4) {
        for (let y = 0; y < H; y += P * 5) {
          if (Math.random() > 0.9) {
            ctx.globalAlpha = Math.random() * 0.5;
            ctx.fillText(Math.random() > 0.5 ? '1' : '0', x, (y + animFrame * 2) % H);
          }
        }
      }
      ctx.globalAlpha = 1;
    }
    if (bgData.nebula) {
      const grad = ctx.createRadialGradient(W * 0.3, H * 0.3, 0, W * 0.3, H * 0.3, 100);
      grad.addColorStop(0, 'rgba(138, 43, 226, 0.4)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 60; i++) px(ctx, (i * 47) % W, (i * 31) % H, '#fff');
    }

    const bounce = animEnabled ? Math.sin(animFrame * 0.15) * 2 : 0;
    const charY = cy + bounce;
    const skinDark = darken(skinColor, 35);
    const skinLight = lighten(skinColor, 25);
    const hairDark = darken(hairColor, 45);

    if (hairStyle === 'long') pxRect(ctx, cx - 55, charY - 20, 110, 90, hairColor);
    if (hairStyle === 'afro') {
      for (let y = -70; y < 50; y += P) for (let x = -70; x < 70; x += P) {
        if (Math.sqrt(x * x + (y + 10) * (y + 10)) < 65) px(ctx, cx + x, charY + y, Math.random() > 0.2 ? hairColor : hairDark);
      }
    }
    if (hairStyle === 'pigtails') {
      pxRect(ctx, cx - 80, charY - 30, 30, 50, hairColor);
      pxRect(ctx, cx + 50, charY - 30, 30, 50, hairColor);
    }
    if (hairStyle === 'curly') {
      for (let i = 0; i < 25; i++) {
        const angle = (i / 25) * Math.PI * 2;
        pxRect(ctx, cx + Math.cos(angle) * 50 - P, charY - 20 + Math.sin(angle) * 40 - P, P * 3, P * 3, i % 3 === 0 ? hairDark : hairColor);
      }
    }

    pxRect(ctx, cx - 45, charY - 30, 90, 65, skinColor);
    pxRect(ctx, cx - 40, charY - 40, 80, P, skinColor);
    pxRect(ctx, cx - 35, charY - 45, 70, P, skinColor);
    pxRect(ctx, cx - 25, charY - 50, 50, P, skinColor);
    pxRect(ctx, cx - 40, charY + 35, 80, P, skinColor);
    pxRect(ctx, cx - 35, charY + 40, 70, P, skinColor);
    pxRect(ctx, cx - 50, charY - 25, P, 55, skinColor);
    pxRect(ctx, cx + 45, charY - 25, P, 55, skinColor);
    pxRect(ctx, cx - 35, charY - 35, P * 3, P * 2, skinLight);
    pxRect(ctx, cx - 30, charY + 35, 60, P * 2, skinDark);
    
    const outline = '#181425';
    for (let x = -25; x < 25; x += P) px(ctx, cx + x, charY - 55, outline);
    for (let x = -35; x < -25; x += P) px(ctx, cx + x, charY - 50, outline);
    for (let x = 25; x < 35; x += P) px(ctx, cx + x, charY - 50, outline);
    for (let y = -35; y < 35; y += P) { px(ctx, cx - 55, charY + y, outline); px(ctx, cx + 50, charY + y, outline); }
    for (let x = -25; x < 25; x += P) px(ctx, cx + x, charY + 50, outline);

    if (hairStyle === 'spiky') {
      [{ x: -35, h: 35 }, { x: -20, h: 50 }, { x: -5, h: 40 }, { x: 10, h: 55 }, { x: 25, h: 45 }, { x: 38, h: 35 }].forEach(s => {
        for (let h = 0; h < s.h; h += P) pxRect(ctx, cx + s.x - P, charY - 50 - h, P * 3, P, hairColor);
      });
      pxRect(ctx, cx - 40, charY - 52, 80, P * 2, hairColor);
    }
    if (hairStyle === 'mohawk') for (let h = 0; h < 70; h += P) pxRect(ctx, cx - P * 2, charY - 55 - h, P * 4, P, hairColor);
    if (hairStyle === 'long') { pxRect(ctx, cx - 42, charY - 52, 84, P * 3, hairColor); pxRect(ctx, cx - 52, charY - 45, P * 2, 60, hairColor); pxRect(ctx, cx + 46, charY - 45, P * 2, 60, hairColor); }
    if (hairStyle === 'punk') [-35, -18, 0, 18, 35].forEach((x, i) => { for (let y = 0; y < (i === 2 ? 80 : 55); y += P) pxRect(ctx, cx + x - P, charY - 55 - y, P * 2, P, hairColor); });
    if (hairStyle === 'bowl') for (let x = -40; x < 40; x += P) pxRect(ctx, cx + x, charY - 55, P, Math.sqrt(1600 - x * x) * 0.4 + 8, hairColor);
    if (hairStyle === 'anime') { [{ x: -38, h: 40 }, { x: -15, h: 60 }, { x: 10, h: 50 }, { x: 32, h: 45 }].forEach(s => { for (let h = 0; h < s.h; h += P) pxRect(ctx, cx + s.x, charY - 55 - h, P * 4 - Math.floor(h / 15) * P, P, hairColor); }); }
    if (hairStyle === 'pigtails') pxRect(ctx, cx - 35, charY - 55, 70, P * 3, hairColor);

    const leftX = cx - 20, rightX = cx + 10, eyeY = charY - 12;
    const blinking = animFrame % 40 > 36 && eyeStyle !== 'happy' && eyeStyle !== 'dead';
    
    if (blinking) { pxRect(ctx, leftX, eyeY + P, P * 4, P, outline); pxRect(ctx, rightX, eyeY + P, P * 4, P, outline); }
    else {
      if (eyeStyle === 'cute') { pxRect(ctx, leftX - P, eyeY - P, P * 5, P * 6, '#fff'); pxRect(ctx, leftX, eyeY, P * 3, P * 4, outline); pxRect(ctx, rightX - P, eyeY - P, P * 5, P * 6, '#fff'); pxRect(ctx, rightX, eyeY, P * 3, P * 4, outline); }
      else if (eyeStyle === 'angry') { pxRect(ctx, leftX, eyeY, P * 4, P * 3, '#fff'); pxRect(ctx, leftX + P, eyeY + P, P * 2, P, outline); pxRect(ctx, rightX, eyeY, P * 4, P * 3, '#fff'); pxRect(ctx, rightX + P, eyeY + P, P * 2, P, outline); }
      else if (eyeStyle === 'happy') { for (let i = 0; i < 4; i++) { px(ctx, leftX + i * P, eyeY + (i < 2 ? -P : 0), outline); px(ctx, rightX + i * P, eyeY + (i < 2 ? -P : 0), outline); } }
      else if (eyeStyle === 'heart') { [leftX, rightX].forEach(x => { px(ctx, x, eyeY - P, '#ff3366'); px(ctx, x + P * 2, eyeY - P, '#ff3366'); pxRect(ctx, x - P, eyeY, P * 5, P * 2, '#ff3366'); }); }
      else if (eyeStyle === 'star') { [leftX, rightX].forEach(x => { px(ctx, x + P, eyeY - P * 2, '#ffdd00'); pxRect(ctx, x - P, eyeY - P, P * 5, P, '#ffdd00'); pxRect(ctx, x, eyeY, P * 3, P * 2, '#ffdd00'); }); }
      else if (eyeStyle === 'money') { [leftX, rightX].forEach(x => { pxRect(ctx, x, eyeY - P, P * 4, P * 5, '#44dd44'); pxRect(ctx, x + P, eyeY, P * 2, P * 3, '#228822'); }); }
      else if (eyeStyle === 'dead') { [leftX, rightX].forEach(x => { px(ctx, x, eyeY - P, outline); px(ctx, x + P * 3, eyeY - P, outline); px(ctx, x + P, eyeY, outline); px(ctx, x + P * 2, eyeY, outline); px(ctx, x, eyeY + P, outline); px(ctx, x + P * 3, eyeY + P, outline); }); }
      else if (eyeStyle === 'laser') { pxRect(ctx, leftX, eyeY, P * 4, P * 3, '#ff0000'); pxRect(ctx, rightX, eyeY, P * 4, P * 3, '#ff0000'); for (let i = 1; i < 6; i++) { ctx.globalAlpha = 1 - i * 0.15; pxRect(ctx, leftX - i * P * 5, eyeY - i * P, P * 3, P * 2, '#ff0000'); pxRect(ctx, rightX + P * 4 + i * P * 5, eyeY - i * P, P * 3, P * 2, '#ff0000'); } ctx.globalAlpha = 1; }
      else { pxRect(ctx, leftX, eyeY, P * 4, P * 3, '#fff'); pxRect(ctx, leftX + P, eyeY + P, P * 2, P, outline); pxRect(ctx, rightX, eyeY, P * 4, P * 3, '#fff'); pxRect(ctx, rightX + P, eyeY + P, P * 2, P, outline); }
    }

    const my = charY + 15;
    if (mouthStyle === 'smile') { pxRect(ctx, cx - P * 3, my, P * 6, P, outline); px(ctx, cx - P * 4, my - P, outline); px(ctx, cx + P * 3, my - P, outline); }
    else if (mouthStyle === 'big_smile') { pxRect(ctx, cx - P * 4, my - P, P * 8, P * 3, outline); pxRect(ctx, cx - P * 3, my, P * 6, P, '#ff6688'); }
    else if (mouthStyle === 'cat') { px(ctx, cx - P * 2, my, outline); px(ctx, cx, my, outline); px(ctx, cx + P * 2, my, outline); px(ctx, cx - P, my + P, outline); px(ctx, cx + P, my + P, outline); }
    else if (mouthStyle === 'fangs') { pxRect(ctx, cx - P * 3, my, P * 6, P, outline); pxRect(ctx, cx - P * 2, my + P, P, P * 2, '#fff'); pxRect(ctx, cx + P, my + P, P, P * 2, '#fff'); }
    else if (mouthStyle === 'tongue') { pxRect(ctx, cx - P * 3, my, P * 6, P, outline); pxRect(ctx, cx - P, my + P, P * 3, P * 3, '#ff6688'); }
    else pxRect(ctx, cx - P * 2, my, P * 4, P, outline);

    if (accessory === 'sunglasses') { pxRect(ctx, cx - 32, eyeY - P, P * 7, P * 5, outline); pxRect(ctx, cx + 8, eyeY - P, P * 7, P * 5, outline); pxRect(ctx, cx - 5, eyeY + P, P * 5, P, outline); }
    if (accessory === 'thug') { pxRect(ctx, cx - 35, eyeY - P * 2, P * 8, P * 5, outline); pxRect(ctx, cx + 5, eyeY - P * 2, P * 8, P * 5, outline); }
    if (accessory === 'monocle') { ctx.strokeStyle = '#ffd700'; ctx.lineWidth = P; ctx.beginPath(); ctx.arc(cx + 18, eyeY + P, P * 4, 0, Math.PI * 2); ctx.stroke(); }
    if (accessory === 'blush') { pxRect(ctx, cx - 40, charY, P * 3, P * 2, '#ff8899'); pxRect(ctx, cx + 25, charY, P * 3, P * 2, '#ff8899'); }
    if (accessory === 'scar') for (let i = 0; i < 5; i++) px(ctx, cx + 25 + i * P, eyeY - P * 2 + i * P, '#883333');

    const topY = charY - 55;
    
    // ═══════════════════════════════════════════════════════════════
    // 🎩 CAPPELLI - TUTTI
    // ═══════════════════════════════════════════════════════════════
    if (hat === 'cap') { 
      // Cappellino baseball
      pxRect(ctx, cx - 40, topY + P, 80, P * 4, '#222'); 
      pxRect(ctx, cx - 35, topY - P * 3, 70, P * 4, '#222'); 
      pxRect(ctx, cx - 55, topY + P * 2, P * 8, P * 3, '#222'); // visiera
      pxRect(ctx, cx - 35, topY - P * 2, P * 2, P, '#ff0000'); // dettaglio
    }
    if (hat === 'crown') { 
      // Corona dorata
      pxRect(ctx, cx - 35, topY, 70, P * 5, '#ffd700'); 
      pxRect(ctx, cx - 35, topY + P, 70, P * 2, '#ffaa00'); // ombra
      [-28, -14, 0, 14, 28].forEach((x, i) => {
        const h = i % 2 === 0 ? P * 6 : P * 8;
        pxRect(ctx, cx + x - P, topY - h + P, P * 3, h, '#ffd700');
        px(ctx, cx + x, topY - h + P, '#ff0000'); // gemme
      });
    }
    if (hat === 'halo') {
      // Aureola angelica
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = P * 2;
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.ellipse(cx, topY - P * 6, 35, 10, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    if (hat === 'horns') {
      // Corna demoniache
      for (let i = 0; i < 6; i++) { 
        const hornColor = i < 3 ? '#cc2222' : '#aa1111';
        pxRect(ctx, cx - 45 - i * P * 1.5, topY - i * P * 5, P * 4, P * 5, hornColor); 
        pxRect(ctx, cx + 35 + i * P * 1.5, topY - i * P * 5, P * 4, P * 5, hornColor); 
      }
      // Punte
      pxRect(ctx, cx - 53, topY - P * 32, P * 2, P * 3, '#ff4444');
      pxRect(ctx, cx + 47, topY - P * 32, P * 2, P * 3, '#ff4444');
    }
    if (hat === 'headphones') {
      // Cuffie
      pxRect(ctx, cx - 50, topY - P * 2, P * 4, P * 12, '#333'); // sinistra
      pxRect(ctx, cx + 42, topY - P * 2, P * 4, P * 12, '#333'); // destra
      pxRect(ctx, cx - 52, topY + P * 2, P * 8, P * 8, '#444'); // padiglione sx
      pxRect(ctx, cx + 40, topY + P * 2, P * 8, P * 8, '#444'); // padiglione dx
      pxRect(ctx, cx - 54, topY + P * 4, P * 3, P * 4, '#00ff88'); // led sx
      pxRect(ctx, cx + 47, topY + P * 4, P * 3, P * 4, '#00ff88'); // led dx
      // Archetto
      for (let i = 0; i < 10; i++) {
        const x = cx - 40 + i * 8;
        const y = topY - P * 4 - Math.sin(i / 9 * Math.PI) * 15;
        pxRect(ctx, x, y, P * 2, P * 2, '#333');
      }
    }
    if (hat === 'wizard') { 
      // Cappello da mago
      for (let i = 0; i < 10; i++) {
        const w = Math.max(P * 2, 55 - i * 5);
        pxRect(ctx, cx - w/2, topY - i * P * 5, w, P * 5, '#3311aa');
        if (i % 2 === 0) pxRect(ctx, cx - w/2 + P, topY - i * P * 5, w - P * 2, P, '#4422cc'); // highlight
      }
      pxRect(ctx, cx - 45, topY + P, 90, P * 3, '#3311aa'); // bordo
      pxRect(ctx, cx - 45, topY + P, 90, P, '#ffd700'); // striscia oro
      // Stelle
      px(ctx, cx + 15, topY - P * 20, '#ffff00');
      px(ctx, cx - 10, topY - P * 30, '#ffff00');
    }
    if (hat === 'cowboy') {
      // Cappello cowboy
      pxRect(ctx, cx - 55, topY + P * 2, 110, P * 3, '#8B4513'); // tesa larga
      pxRect(ctx, cx - 35, topY - P * 6, 70, P * 8, '#8B4513'); // cupola
      pxRect(ctx, cx - 30, topY - P * 8, 60, P * 3, '#8B4513'); // top
      pxRect(ctx, cx - 30, topY - P * 2, 60, P * 2, '#654321'); // fascia
      // Piega caratteristica
      pxRect(ctx, cx - 15, topY - P * 10, 30, P * 2, '#9B5523');
    }
    if (hat === 'beanie') {
      // Berretto di lana
      for (let i = 0; i < 6; i++) {
        const w = 70 - i * 5;
        pxRect(ctx, cx - w/2, topY - i * P * 3, w, P * 3, i % 2 === 0 ? '#cc3333' : '#222');
      }
      // Pompon
      pxRect(ctx, cx - P * 3, topY - P * 22, P * 6, P * 5, '#cc3333');
      pxRect(ctx, cx - P * 2, topY - P * 24, P * 4, P * 3, '#cc3333');
    }
    if (hat === 'tophat') {
      // Cilindro elegante
      pxRect(ctx, cx - 50, topY + P, 100, P * 3, '#111'); // tesa
      pxRect(ctx, cx - 30, topY - P * 15, 60, P * 16, '#111'); // cilindro
      pxRect(ctx, cx - 30, topY - P * 12, 60, P * 2, '#cc0000'); // nastro rosso
      pxRect(ctx, cx - 28, topY - P * 14, 56, P, '#333'); // highlight
    }
    if (hat === 'party') {
      // 🎉 Cappello festa conico colorato
      const colors = ['#ff2266', '#ffdd00', '#00cc66', '#2266ff', '#ff22ff'];
      // Cono principale
      for (let i = 0; i < 12; i++) {
        const w = Math.max(P * 3, 50 - i * 4);
        const color = colors[i % colors.length];
        pxRect(ctx, cx - w/2, topY - i * P * 3 + P * 5, w, P * 3, color);
      }
      // Bordo dorato alla base
      pxRect(ctx, cx - 28, topY + P * 5, 56, P * 2, '#ffd700');
      pxRect(ctx, cx - 26, topY + P * 3, 52, P * 2, '#ffaa00');
      // Pompon in cima
      pxRect(ctx, cx - P * 3, topY - P * 32, P * 6, P * 4, '#ff4488');
      pxRect(ctx, cx - P * 2, topY - P * 34, P * 4, P * 2, '#ff6699');
      pxRect(ctx, cx - P * 2, topY - P * 30, P * 4, P * 2, '#ff2266');
      // Stelle decorative
      px(ctx, cx - 15, topY - P * 10, '#fff');
      px(ctx, cx + 12, topY - P * 18, '#fff');
      px(ctx, cx - 8, topY - P * 25, '#fff');
    }
    if (hat === 'cat_ears') {
      // 🐱 Orecchie da gatto realistiche
      const earColor = skinColor;
      const innerColor = '#ffaaaa';
      const darkColor = darken(skinColor, 20);
      // Orecchio sinistro - triangolo
      pxRect(ctx, cx - 45, topY - P * 2, P * 14, P * 4, earColor);
      pxRect(ctx, cx - 43, topY - P * 6, P * 12, P * 4, earColor);
      pxRect(ctx, cx - 41, topY - P * 10, P * 10, P * 4, earColor);
      pxRect(ctx, cx - 39, topY - P * 14, P * 8, P * 4, earColor);
      pxRect(ctx, cx - 37, topY - P * 18, P * 6, P * 4, earColor);
      pxRect(ctx, cx - 35, topY - P * 22, P * 4, P * 4, earColor);
      // Interno sinistro
      pxRect(ctx, cx - 41, topY - P * 2, P * 8, P * 3, innerColor);
      pxRect(ctx, cx - 39, topY - P * 6, P * 6, P * 4, innerColor);
      pxRect(ctx, cx - 37, topY - P * 10, P * 4, P * 4, innerColor);
      // Orecchio destro - triangolo
      pxRect(ctx, cx + 30, topY - P * 2, P * 14, P * 4, earColor);
      pxRect(ctx, cx + 30, topY - P * 6, P * 12, P * 4, earColor);
      pxRect(ctx, cx + 30, topY - P * 10, P * 10, P * 4, earColor);
      pxRect(ctx, cx + 30, topY - P * 14, P * 8, P * 4, earColor);
      pxRect(ctx, cx + 32, topY - P * 18, P * 6, P * 4, earColor);
      pxRect(ctx, cx + 32, topY - P * 22, P * 4, P * 4, earColor);
      // Interno destro
      pxRect(ctx, cx + 32, topY - P * 2, P * 8, P * 3, innerColor);
      pxRect(ctx, cx + 32, topY - P * 6, P * 6, P * 4, innerColor);
      pxRect(ctx, cx + 34, topY - P * 10, P * 4, P * 4, innerColor);
      // Contorno scuro
      pxRect(ctx, cx - 46, topY - P * 2, P, P * 4, darkColor);
      pxRect(ctx, cx + 43, topY - P * 2, P, P * 4, darkColor);
    }
    if (hat === 'bunny_ears') {
      // 🐰 Orecchie da coniglio lunghe e carine
      const earW = P * 5;
      // Orecchio sinistro - lungo e arrotondato
      pxRect(ctx, cx - 35, topY - P * 8, earW + P * 2, P * 10, '#fff');
      pxRect(ctx, cx - 34, topY - P * 18, earW, P * 10, '#fff');
      pxRect(ctx, cx - 33, topY - P * 28, earW - P, P * 10, '#fff');
      pxRect(ctx, cx - 32, topY - P * 36, earW - P * 2, P * 8, '#fff');
      pxRect(ctx, cx - 31, topY - P * 40, earW - P * 2, P * 4, '#fff');
      // Interno sinistro rosa
      pxRect(ctx, cx - 33, topY - P * 6, P * 3, P * 6, '#ffbbcc');
      pxRect(ctx, cx - 32, topY - P * 14, P * 3, P * 8, '#ffbbcc');
      pxRect(ctx, cx - 31, topY - P * 24, P * 2, P * 10, '#ffbbcc');
      pxRect(ctx, cx - 31, topY - P * 32, P * 2, P * 8, '#ffbbcc');
      // Orecchio destro
      pxRect(ctx, cx + 28, topY - P * 8, earW + P * 2, P * 10, '#fff');
      pxRect(ctx, cx + 29, topY - P * 18, earW, P * 10, '#fff');
      pxRect(ctx, cx + 30, topY - P * 28, earW - P, P * 10, '#fff');
      pxRect(ctx, cx + 30, topY - P * 36, earW - P * 2, P * 8, '#fff');
      pxRect(ctx, cx + 30, topY - P * 40, earW - P * 2, P * 4, '#fff');
      // Interno destro rosa
      pxRect(ctx, cx + 30, topY - P * 6, P * 3, P * 6, '#ffbbcc');
      pxRect(ctx, cx + 30, topY - P * 14, P * 3, P * 8, '#ffbbcc');
      pxRect(ctx, cx + 31, topY - P * 24, P * 2, P * 10, '#ffbbcc');
      pxRect(ctx, cx + 31, topY - P * 32, P * 2, P * 8, '#ffbbcc');
      // Ombra leggera
      pxRect(ctx, cx - 36, topY - P * 6, P, P * 8, '#eee');
      pxRect(ctx, cx + 35, topY - P * 6, P, P * 8, '#eee');
    }
    if (hat === 'antenna') {
      // 👽 Antenna aliena con cerchietto
      // Cerchietto sulla testa
      pxRect(ctx, cx - 40, topY + P * 2, 80, P * 3, '#444');
      pxRect(ctx, cx - 38, topY + P, 76, P, '#666');
      // Antenna sinistra
      pxRect(ctx, cx - 25, topY - P * 25, P * 2, P * 27, '#555');
      pxRect(ctx, cx - 26, topY - P * 20, P, P * 15, '#666'); // highlight
      // Pallina sinistra con glow
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 15;
      pxRect(ctx, cx - 29, topY - P * 30, P * 8, P * 6, '#00ff88');
      pxRect(ctx, cx - 28, topY - P * 31, P * 6, P * 2, '#88ffbb');
      ctx.shadowBlur = 0;
      // Antenna destra
      pxRect(ctx, cx + 22, topY - P * 25, P * 2, P * 27, '#555');
      pxRect(ctx, cx + 24, topY - P * 20, P, P * 15, '#666'); // highlight
      // Pallina destra con glow diverso
      ctx.shadowColor = '#ff00ff';
      ctx.shadowBlur = 15;
      pxRect(ctx, cx + 19, topY - P * 30, P * 8, P * 6, '#ff44ff');
      pxRect(ctx, cx + 20, topY - P * 31, P * 6, P * 2, '#ff88ff');
      ctx.shadowBlur = 0;
    }

    // ═══════════════════════════════════════════════════════════════
    // 🎒 ITEMS - TUTTI
    // ═══════════════════════════════════════════════════════════════
    const ix = cx + 55, iy = charY + 20;
    
    if (item === 'joint') { 
      // Sigaretta/Joint
      pxRect(ctx, cx + 28, charY + 14, P * 14, P * 3, '#f5f5dc'); 
      pxRect(ctx, cx + 28, charY + 15, P * 3, P, '#fff'); // filtro
      // Fumo animato
      const smokeOffset = animFrame % 20;
      ctx.globalAlpha = 0.5;
      pxRect(ctx, cx + 78, charY + 8 - smokeOffset, P * 3, P * 2, '#aaa');
      pxRect(ctx, cx + 82, charY + 4 - smokeOffset, P * 2, P * 2, '#ccc');
      ctx.globalAlpha = 1;
      pxRect(ctx, cx + 75, charY + 12, P * 4, P * 4, '#ff4500'); // brace
    }
    if (item === 'chain') { 
      // Collana con ciondolo
      for (let i = 0; i < 14; i++) {
        const x = cx - 35 + i * 5;
        const y = charY + 42 + Math.sin(i * 0.5) * 6;
        pxRect(ctx, x, y, P * 3, P * 3, '#ffd700');
        pxRect(ctx, x + P, y + P, P, P, '#ffaa00'); // ombra
      }
      // Ciondolo grande
      pxRect(ctx, cx - P * 5, charY + 55, P * 10, P * 10, '#ffd700');
      pxRect(ctx, cx - P * 3, charY + 57, P * 6, P * 6, '#00ff88'); // gemma
    }
    if (item === 'money') {
      // Mazzetta di soldi
      pxRect(ctx, ix - P * 2, iy, P * 14, P * 8, '#228822');
      pxRect(ctx, ix, iy + P, P * 10, P * 6, '#33aa33');
      pxRect(ctx, ix + P * 2, iy + P * 2, P * 6, P * 4, '#44cc44');
      // Simbolo $
      pxRect(ctx, ix + P * 4, iy + P * 3, P * 2, P * 2, '#fff');
    }
    if (item === 'coffee') { 
      // Tazza di caffè
      pxRect(ctx, ix, iy, P * 8, P * 12, '#fff');
      pxRect(ctx, ix + P, iy + P, P * 6, P * 6, '#4a2c00'); // caffè
      pxRect(ctx, ix + P * 8, iy + P * 3, P * 3, P * 6, '#fff'); // manico
      // Vapore
      ctx.globalAlpha = 0.4;
      const steamY = animFrame % 10;
      pxRect(ctx, ix + P * 2, iy - P * 3 - steamY, P * 2, P * 2, '#fff');
      pxRect(ctx, ix + P * 5, iy - P * 5 - steamY, P * 2, P * 2, '#fff');
      ctx.globalAlpha = 1;
    }
    if (item === 'phone') {
      // Smartphone
      pxRect(ctx, ix, iy, P * 7, P * 12, '#222');
      pxRect(ctx, ix + P, iy + P, P * 5, P * 9, '#4488ff'); // schermo
      pxRect(ctx, ix + P * 2, iy + P * 10, P * 3, P, '#333'); // tasto
    }
    if (item === 'sword') { 
      // Spada
      pxRect(ctx, ix + P * 2, iy - P * 20, P * 3, P * 30, '#ccc'); // lama
      pxRect(ctx, ix + P * 3, iy - P * 18, P, P * 26, '#fff'); // highlight
      pxRect(ctx, ix - P, iy + P * 8, P * 9, P * 3, '#8b4513'); // guardia
      pxRect(ctx, ix + P, iy + P * 11, P * 5, P * 8, '#654321'); // impugnatura
      pxRect(ctx, ix + P * 2, iy + P * 19, P * 3, P * 3, '#ffd700'); // pomolo
    }
    if (item === 'rose') {
      // Rosa
      pxRect(ctx, ix + P * 2, iy, P * 2, P * 15, '#228822'); // stelo
      // Petali
      pxRect(ctx, ix, iy - P * 5, P * 6, P * 5, '#ff3366');
      pxRect(ctx, ix - P, iy - P * 3, P * 3, P * 4, '#ff3366');
      pxRect(ctx, ix + P * 4, iy - P * 3, P * 3, P * 4, '#ff3366');
      pxRect(ctx, ix + P, iy - P * 7, P * 4, P * 3, '#ff5588');
      // Foglia
      pxRect(ctx, ix + P * 4, iy + P * 5, P * 4, P * 2, '#33aa33');
    }
    if (item === 'pizza') {
      // Fetta di pizza
      pxRect(ctx, ix, iy, P * 12, P * 3, '#ffcc66'); // crosta
      for (let i = 0; i < 4; i++) {
        pxRect(ctx, ix + i * P * 2, iy + P * 3 + i * P, P * 12 - i * P * 4, P, '#ffcc66');
      }
      // Formaggio
      pxRect(ctx, ix + P * 2, iy + P, P * 8, P * 5, '#ffdd44');
      // Pepperoni
      pxRect(ctx, ix + P * 3, iy + P * 2, P * 2, P * 2, '#cc3333');
      pxRect(ctx, ix + P * 6, iy + P * 3, P * 2, P * 2, '#cc3333');
    }
    if (item === 'controller') { 
      // Controller gaming
      pxRect(ctx, ix, iy, P * 14, P * 8, '#333');
      pxRect(ctx, ix + P, iy + P, P * 4, P * 4, '#222'); // d-pad area
      pxRect(ctx, ix + P * 2, iy + P * 2, P * 2, P * 2, '#444'); // d-pad
      // Pulsanti colorati
      px(ctx, ix + P * 9, iy + P * 2, '#ff0000');
      px(ctx, ix + P * 11, iy + P * 2, '#0000ff');
      px(ctx, ix + P * 10, iy + P, '#ffff00');
      px(ctx, ix + P * 10, iy + P * 3, '#00ff00');
      // Stick analogici
      pxRect(ctx, ix + P * 4, iy + P * 5, P * 2, P * 2, '#666');
      pxRect(ctx, ix + P * 8, iy + P * 5, P * 2, P * 2, '#666');
    }

    // ═══════════════════════════════════════════════════════════════
    // ✨ EFFETTI - TUTTI
    // ═══════════════════════════════════════════════════════════════
    if (effect === 'sparkle') {
      for (let i = 0; i < 20; i++) {
        const x = (animFrame * 5 + i * 47) % W;
        const y = (i * 31 + animFrame * 2) % H;
        const size = (i % 3) + 1;
        ctx.globalAlpha = 0.5 + Math.sin(animFrame * 0.3 + i) * 0.5;
        pxRect(ctx, x, y, P * size, P * size, '#fff');
        pxRect(ctx, x + P, y - P, P, P, '#ffff88');
      }
      ctx.globalAlpha = 1;
    }
    if (effect === 'hearts') {
      for (let i = 0; i < 10; i++) {
        const x = (animFrame * 2 + i * 50) % W;
        const y = H - (animFrame * 3 + i * 40) % (H + 50);
        ctx.globalAlpha = 0.7;
        // Cuore stilizzato
        px(ctx, x, y, '#ff4488');
        px(ctx, x + P * 2, y, '#ff4488');
        pxRect(ctx, x - P, y + P, P * 4, P, '#ff4488');
        pxRect(ctx, x, y + P * 2, P * 2, P, '#ff4488');
      }
      ctx.globalAlpha = 1;
    }
    if (effect === 'fire') {
      for (let i = 0; i < 20; i++) {
        const x = cx - 60 + (i * 17) % 120;
        const baseY = H - 15;
        const h = 20 + Math.sin(animFrame * 0.5 + i) * 30;
        const colors = ['#ff0000', '#ff4400', '#ff8800', '#ffaa00', '#ffcc00'];
        for (let j = 0; j < 5; j++) {
          const flameY = baseY - j * P * 3 - (animFrame * 2 + i * 5) % 30;
          if (flameY > H - 80) {
            ctx.globalAlpha = 1 - j * 0.2;
            pxRect(ctx, x, flameY, P * 3, P * 4, colors[j]);
          }
        }
      }
      ctx.globalAlpha = 1;
    }
    if (effect === 'money_rain') {
      for (let i = 0; i < 15; i++) {
        const x = (i * 37) % W;
        const y = (animFrame * 5 + i * 30) % (H + 20) - 20;
        ctx.globalAlpha = 0.8;
        pxRect(ctx, x, y, P * 4, P * 2, '#44aa44');
        pxRect(ctx, x + P, y, P * 2, P, '#66cc66');
      }
      ctx.globalAlpha = 1;
    }
    if (effect === 'tears') {
      // Lacrime che scendono
      const tearY = (animFrame * 4) % 50;
      ctx.globalAlpha = 0.8;
      pxRect(ctx, cx - 30, charY + tearY, P * 2, P * 4, '#66ccff');
      pxRect(ctx, cx + 25, charY + tearY + 10, P * 2, P * 4, '#66ccff');
      pxRect(ctx, cx - 28, charY + tearY + 25, P * 2, P * 3, '#66ccff');
      ctx.globalAlpha = 1;
    }
    if (effect === 'rage') {
      // Vene di rabbia
      pxRect(ctx, cx - 45, charY - 45, P * 3, P, '#ff0000');
      pxRect(ctx, cx - 43, charY - 43, P, P * 3, '#ff0000');
      pxRect(ctx, cx + 38, charY - 45, P * 3, P, '#ff0000');
      pxRect(ctx, cx + 42, charY - 43, P, P * 3, '#ff0000');
      // Fumo dalla testa
      if (animFrame % 10 < 5) {
        ctx.globalAlpha = 0.5;
        pxRect(ctx, cx - 20, charY - 70 - (animFrame % 10), P * 3, P * 3, '#ff4444');
        pxRect(ctx, cx + 15, charY - 75 - (animFrame % 10), P * 3, P * 3, '#ff4444');
        ctx.globalAlpha = 1;
      }
    }
    if (effect === 'sleep') {
      // ZZZ
      const zOffset = animFrame % 30;
      ctx.globalAlpha = 0.8;
      pxRect(ctx, cx + 50, charY - 30 - zOffset * 0.5, P * 4, P, '#fff');
      pxRect(ctx, cx + 52, charY - 28 - zOffset * 0.5, P * 4, P, '#fff');
      pxRect(ctx, cx + 50, charY - 26 - zOffset * 0.5, P * 4, P, '#fff');
      // Z più grande
      pxRect(ctx, cx + 60, charY - 50 - zOffset * 0.3, P * 5, P * 2, '#fff');
      pxRect(ctx, cx + 63, charY - 46 - zOffset * 0.3, P * 5, P * 2, '#fff');
      pxRect(ctx, cx + 60, charY - 42 - zOffset * 0.3, P * 5, P * 2, '#fff');
      ctx.globalAlpha = 1;
    }
    if (effect === 'music') {
      // Note musicali
      const noteOffset = animFrame % 40;
      ctx.globalAlpha = 0.8;
      // Nota 1
      pxRect(ctx, cx + 50, charY - 40 - noteOffset, P * 2, P * 6, '#fff');
      pxRect(ctx, cx + 46, charY - 40 - noteOffset, P * 4, P * 3, '#fff');
      // Nota 2
      pxRect(ctx, cx + 65, charY - 55 - noteOffset * 0.8, P * 2, P * 5, '#ffff00');
      pxRect(ctx, cx + 62, charY - 55 - noteOffset * 0.8, P * 3, P * 2, '#ffff00');
      ctx.globalAlpha = 1;
    }
    if (effect === 'lightning') {
      if (animFrame % 15 < 4) {
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 20;
        // Fulmine zigzag
        pxRect(ctx, cx + 45, charY - 90, P * 4, P * 8, '#ffff00');
        pxRect(ctx, cx + 50, charY - 82, P * 4, P * 8, '#ffff00');
        pxRect(ctx, cx + 45, charY - 74, P * 4, P * 8, '#ffff00');
        pxRect(ctx, cx + 50, charY - 66, P * 3, P * 10, '#ffff00');
        ctx.shadowBlur = 0;
      }
    }
    if (effect === 'snow') {
      for (let i = 0; i < 25; i++) {
        const x = (i * 23 + animFrame) % W;
        const y = (animFrame * 2 + i * 17) % H;
        ctx.globalAlpha = 0.7 + Math.sin(i) * 0.3;
        const size = (i % 2) + 1;
        pxRect(ctx, x, y, P * size, P * size, '#fff');
      }
      ctx.globalAlpha = 1;
    }

  }, [bg, skinColor, hairStyle, hairColor, eyeStyle, mouthStyle, accessory, hat, item, effect, animFrame, animEnabled]);

  // Mint NFT (with SOL payment)
  const mintNFT = async () => {
    if (!walletAddress) {
      setMintError('Connect your Phantom wallet first!');
      playSound('error');
      return;
    }

    setMintError('');
    setMintSuccess('');

    if (isAlreadyMinted()) {
      playSound('error');
      setMintError('⚠️ This combination already exists! Make it unique.');
      return;
    }

    setIsMinting(true);

    try {
      const provider = getPhantomProvider();
      if (!provider) {
        setMintError('Phantom wallet not found!');
        setIsMinting(false);
        return;
      }

      // Check if mint price is configured and FEE_WALLET is set
      if (CONFIG.MINT_PRICE > 0 && CONFIG.FEE_WALLET && CONFIG.FEE_WALLET !== "YOUR_SOLANA_WALLET_HERE") {
        
        // Create mint payment transaction
        const transaction = new Transaction();
        
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = new PublicKey(walletAddress);

        // Transfer mint fee to platform wallet
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: new PublicKey(walletAddress),
            toPubkey: new PublicKey(CONFIG.FEE_WALLET),
            lamports: Math.floor(CONFIG.MINT_PRICE * LAMPORTS_PER_SOL),
          })
        );

        setMintSuccess(`⏳ Pay ${CONFIG.MINT_PRICE} SOL to mint...`);
        
        // Sign and send transaction
        const { signature } = await provider.signAndSendTransaction(transaction);
        
        setMintSuccess('⏳ Confirming payment...');
        
        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');
        
        if (confirmation.value.err) {
          throw new Error('Payment failed');
        }

        setMintSuccess('✅ Payment confirmed! Creating NFT...');
      }

      // Create NFT after payment (or directly if no payment required)
      const canvas = canvasRef.current;
      const imageData = canvas.toDataURL('image/png');
      const serialNumber = (mintedNFTs.length + 1).toString().padStart(5, '0');
      const score = getRarityScore();

      const nftData = {
        serialNumber,
        hash: getConfigHash(),
        image: imageData,
        config: { bg, skinColor, hairStyle, hairColor, eyeStyle, mouthStyle, accessory, hat, item, effect },
        score,
        rarity: getOverallRarity(score),
        owner: walletAddress,
        mintedAt: new Date().toISOString(),
        // Marketplace fields
        forSale: false,
        price: null,
        listedAt: null,
      };

      await saveNFTToFirebase(nftData);
      
      playSound('mint');
      setMintSuccess(`🎉 NFT #${serialNumber} minted to ${shortAddress(walletAddress)}!`);
      setShowCard(false);
    } catch (error) {
      console.error('Mint error:', error);
      if (error.message?.includes('User rejected')) {
        setMintError('Transaction cancelled');
      } else if (error.message?.includes('insufficient')) {
        setMintError('Insufficient SOL balance!');
      } else {
        setMintError('Failed to mint: ' + (error.message || 'Unknown error'));
      }
      playSound('error');
    }

    setIsMinting(false);
  };

  // ═══════════════════════════════════════════════════════════════
  // 🏪 MARKETPLACE FUNCTIONS
  // ═══════════════════════════════════════════════════════════════
  
  // List NFT for sale
  const listForSale = async () => {
    if (!selectedNFT || !sellPrice || parseFloat(sellPrice) <= 0) {
      setMintError('Please enter a valid price');
      return;
    }

    try {
      await updateNFTInFirebase(selectedNFT.id, {
        forSale: true,
        price: parseFloat(sellPrice),
        listedAt: new Date().toISOString(),
      });
      
      playSound('mint');
      setMintSuccess(`NFT listed for ${sellPrice} SOL!`);
      setShowSellModal(false);
      setSelectedNFT(null);
      setSellPrice('');
    } catch (error) {
      setMintError('Failed to list NFT');
      playSound('error');
    }
  };

  // Cancel listing
  const cancelListing = async (nft) => {
    try {
      await updateNFTInFirebase(nft.id, {
        forSale: false,
        price: null,
        listedAt: null,
      });
      playSound('select');
      setMintSuccess('Listing cancelled!');
    } catch (error) {
      setMintError('Failed to cancel listing');
      playSound('error');
    }
  };

  // Buy NFT (REAL SOL TRANSFER)
  const buyNFT = async (nft) => {
    if (!walletAddress) {
      setMintError('Connect your wallet to buy!');
      return;
    }

    if (nft.owner === walletAddress) {
      setMintError("You can't buy your own NFT!");
      return;
    }

    setMintError('');
    setMintSuccess('');

    try {
      const provider = getPhantomProvider();
      if (!provider) {
        setMintError('Phantom wallet not found!');
        return;
      }

      // Calculate amounts
      const totalPrice = nft.price;
      const feeAmount = (totalPrice * CONFIG.FEE_PERCENT) / 100;
      const sellerAmount = totalPrice - feeAmount;

      // Create transaction
      const transaction = new Transaction();
      
      // Get latest blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = new PublicKey(walletAddress);

      // Transfer to Seller
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(walletAddress),
          toPubkey: new PublicKey(nft.owner),
          lamports: Math.floor(sellerAmount * LAMPORTS_PER_SOL),
        })
      );

      // Transfer Fee to Platform (if fee wallet is set)
      if (CONFIG.FEE_WALLET && CONFIG.FEE_WALLET !== "YOUR_SOLANA_WALLET_HERE" && feeAmount > 0) {
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: new PublicKey(walletAddress),
            toPubkey: new PublicKey(CONFIG.FEE_WALLET),
            lamports: Math.floor(feeAmount * LAMPORTS_PER_SOL),
          })
        );
      }

      // Sign and send transaction
      setMintSuccess('⏳ Please approve the transaction in Phantom...');
      
      const { signature } = await provider.signAndSendTransaction(transaction);
      
      setMintSuccess('⏳ Confirming transaction...');
      
      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error('Transaction failed');
      }

      // Update database after successful transfer
      await updateNFTInFirebase(nft.id, {
        owner: walletAddress,
        forSale: false,
        price: null,
        listedAt: null,
        lastSoldPrice: nft.price,
        lastSoldAt: new Date().toISOString(),
        lastTxSignature: signature,
      });
      
      playSound('mint');
      setMintSuccess(`🎉 You bought NFT #${nft.serialNumber} for ${nft.price} SOL! Tx: ${signature.slice(0, 8)}...`);
    } catch (error) {
      console.error('Buy error:', error);
      if (error.message?.includes('User rejected')) {
        setMintError('Transaction cancelled by user');
      } else if (error.message?.includes('insufficient')) {
        setMintError('Insufficient SOL balance!');
      } else {
        setMintError('Transaction failed: ' + (error.message || 'Unknown error'));
      }
      playSound('error');
    }
  };

  const downloadPNG = () => {
    playSound('special');
    const link = document.createElement('a');
    link.href = canvasRef.current.toDataURL('image/png');
    link.download = `pfp-${Date.now()}.png`;
    link.click();
  };

  const randomize = () => {
    playSound('special');
    const rand = arr => arr[Math.floor(Math.random() * arr.length)];
    setBg(rand(Object.keys(backgrounds)));
    setSkinColor(rand(skinColors).color);
    setHairStyle(rand(hairStyles).id);
    setHairColor(rand(hairColors).color);
    setEyeStyle(rand(eyeStyles).id);
    setMouthStyle(rand(mouthStyles).id);
    setAccessory(rand(accessories).id);
    setHat(rand(hats).id);
    setItem(rand(items).id);
    setEffect(rand(effects).id);
  };

  // Filter NFTs based on view mode
  const getFilteredNFTs = () => {
    switch (viewMode) {
      case 'mine':
        return mintedNFTs.filter(nft => nft.owner === walletAddress);
      case 'sale':
        return mintedNFTs.filter(nft => nft.forSale);
      default:
        return mintedNFTs;
    }
  };

  const displayedNFTs = getFilteredNFTs();

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ fontFamily: "'Press Start 2P'", fontSize: '8px', color: '#00ff88', marginBottom: '6px' }}>{title}</div>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>{children}</div>
    </div>
  );

  const OptionBtn = ({ active, onClick, children }) => {
    return (
      <button 
        type="button" 
        onPointerUp={() => { onClick(); playSound('select'); }}
        style={{ 
          padding: '6px 10px', 
          background: active ? 'linear-gradient(135deg, #00ff88, #00aa55)' : 'rgba(255,255,255,0.1)', 
          border: `2px solid ${active ? '#00ff88' : 'rgba(255,255,255,0.2)'}`, 
          borderRadius: '4px', 
          color: active ? '#000' : '#fff', 
          fontSize: '10px', 
          fontWeight: '600', 
          cursor: 'pointer',
          touchAction: 'manipulation',
        }}
      >{children}</button>
    );
  };

  const ColorBtn = ({ active, onClick, color }) => {
    return (
      <button 
        type="button" 
        onPointerUp={() => { onClick(); playSound('select'); }}
        style={{ 
          width: '28px', 
          height: '28px', 
          background: color, 
          border: `3px solid ${active ? '#00ff88' : 'rgba(255,255,255,0.2)'}`, 
          borderRadius: '4px', 
          cursor: 'pointer', 
          boxShadow: active ? '0 0 10px rgba(0,255,136,0.5)' : 'none',
          touchAction: 'manipulation',
        }}
      />
    );
  };

  const RarityBadge = ({ rarity }) => (
    <span style={{ padding: '3px 8px', background: rarities[rarity].color, borderRadius: '4px', fontSize: '9px', fontWeight: 'bold', color: '#fff' }}>{rarities[rarity].name}</span>
  );

  const TwitterIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );

  const DexScreenerIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 6v6l4 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a1a 100%)', fontFamily: 'system-ui', color: '#fff', padding: '15px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        .title { font-family: 'Press Start 2P'; text-shadow: 0 0 10px #00ff88, 0 0 20px #00ff88; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        .float { animation: float 3s ease-in-out infinite; }
        .panel { background: rgba(0,255,136,0.03); border: 2px solid rgba(0,255,136,0.2); border-radius: 8px; padding: 12px; }
        .scroll::-webkit-scrollbar { width: 6px; }
        .scroll::-webkit-scrollbar-thumb { background: rgba(0,255,136,0.4); border-radius: 3px; }
        .scroll button { position: relative; z-index: 100; pointer-events: auto !important; }
        .scroll * { pointer-events: auto; }
        .action-btn { padding: 10px 16px; font-family: 'Press Start 2P'; font-size: 8px; border: none; border-radius: 6px; cursor: pointer; transition: all 0.2s; }
        .action-btn:hover { transform: translateY(-2px); }
        .action-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        .pulse { animation: pulse 2s infinite; }
        .social-btn { display: flex; align-items: center; justify-content: center; width: 50px; height: 50px; border-radius: 12px; border: 2px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); cursor: pointer; transition: all 0.3s; color: #888; text-decoration: none; }
        .social-btn:hover { border-color: #00ff88; color: #00ff88; transform: translateY(-3px); box-shadow: 0 5px 20px rgba(0,255,136,0.3); }
        .sale-badge { position: absolute; top: 8px; left: 8px; background: linear-gradient(135deg, #ff6b6b, #ee5a5a); padding: 4px 8px; border-radius: 4px; font-family: 'Press Start 2P'; font-size: 7px; color: #fff; }
        .nft-card { position: relative; background: rgba(0,0,0,0.3); border-radius: 8px; padding: 12px; transition: all 0.3s; }
        .nft-card:hover { transform: translateY(-5px); box-shadow: 0 10px 30px rgba(0,255,136,0.2); }
      `}</style>

      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '15px' }}>
          <h1 className="title" style={{ fontSize: '20px', margin: '0' }}>🖼️ PICTURES FOR PUMP 🖼️</h1>
          <p style={{ fontFamily: "'Press Start 2P'", fontSize: '7px', opacity: 0.5, marginTop: '8px' }}>PIXEL PFP MAKER ON SOLANA</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
          {!walletAddress ? (
            <button className="action-btn" onClick={connectWallet} disabled={isConnecting}
              style={{ background: 'linear-gradient(135deg, #ab47bc, #7c4dff)', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isConnecting ? <><span className="pulse">⏳</span> Connecting...</> : <>👻 Connect Phantom</>}
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: 'rgba(171, 71, 188, 0.2)', border: '2px solid #ab47bc', borderRadius: '8px', padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>👻</span>
                <span style={{ fontFamily: "'Press Start 2P'", fontSize: '8px', color: '#ab47bc' }}>{shortAddress(walletAddress)}</span>
              </div>
              <button className="action-btn" onClick={disconnectWallet} style={{ background: '#444', color: '#fff', padding: '8px 12px' }}>✖️</button>
            </div>
          )}
        </div>
        {walletError && <div style={{ textAlign: 'center', color: '#ff4444', fontSize: '10px', marginBottom: '10px' }}>{walletError}</div>}

        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
          <button className="action-btn" onClick={() => { setShowMarketplace(false); setShowBotDashboard(false); }} style={{ background: !showMarketplace && !showBotDashboard ? '#00ff88' : '#333', color: !showMarketplace && !showBotDashboard ? '#000' : '#fff' }}>🎨 CREATE</button>
          <button className="action-btn" onClick={() => { setShowMarketplace(true); setShowBotDashboard(false); }} style={{ background: showMarketplace ? '#00ff88' : '#333', color: showMarketplace ? '#000' : '#fff' }}>🏪 MARKETPLACE ({mintedNFTs.length})</button>
          <button className="action-btn" onClick={() => { setShowMarketplace(false); setShowBotDashboard(true); }} style={{ background: showBotDashboard ? '#ff6b6b' : '#333', color: showBotDashboard ? '#fff' : '#fff' }}>🤖 BOT</button>
        </div>

        {!showMarketplace && !showBotDashboard ? (
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="float">
                <div className="panel" style={{ position: 'relative' }}>
                  <canvas ref={canvasRef} width={280} height={280} style={{ display: 'block', borderRadius: '6px', imageRendering: 'pixelated' }} />
                  <div style={{ position: 'absolute', top: '12px', right: '12px' }}><RarityBadge rarity={getOverallRarity()} /></div>
                </div>
              </div>

              <div className="panel" style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Press Start 2P'", fontSize: '8px', color: '#00ff88' }}>⭐ SCORE</div>
                <div style={{ fontFamily: "'Press Start 2P'", fontSize: '22px', color: rarities[getOverallRarity()].color }}>{getRarityScore()}</div>
                {isAlreadyMinted() && <div style={{ fontFamily: "'Press Start 2P'", fontSize: '7px', color: '#ff4444', marginTop: '5px' }}>⚠️ ALREADY MINTED</div>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button className="action-btn" onClick={randomize} style={{ background: 'linear-gradient(135deg, #9575CD, #64B5F6)', color: '#fff' }}>🎲 RANDOM</button>
                <button className="action-btn" onClick={downloadPNG} style={{ background: 'linear-gradient(135deg, #4CAF50, #45a049)', color: '#fff' }}>⬇️ PNG</button>
                <button className="action-btn" onClick={() => {
                  if (walletAddress) {
                    setMintPreviewImage(canvasRef.current.toDataURL('image/png'));
                    setShowCard(true);
                  } else {
                    connectWallet();
                  }
                }} 
                  style={{ background: walletAddress ? 'linear-gradient(135deg, #ff6b6b, #ee5a5a)' : 'linear-gradient(135deg, #ab47bc, #7c4dff)', color: '#fff' }}>
                  {walletAddress ? '🎫 MINT NFT' : '👻 CONNECT'}
                </button>
                <button className="action-btn" onClick={generateLore} style={{ background: 'linear-gradient(135deg, #a855f7, #9333ea)', color: '#fff' }}>📜 LORE</button>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="action-btn" onClick={() => setAnimEnabled(!animEnabled)} style={{ flex: 1, background: animEnabled ? '#00aa55' : '#444', color: '#fff' }}>{animEnabled ? '⏸️' : '▶️'}</button>
                <button className="action-btn" onClick={() => setSoundEnabled(!soundEnabled)} style={{ flex: 1, background: soundEnabled ? '#00aa55' : '#444', color: '#fff' }}>{soundEnabled ? '🔊' : '🔇'}</button>
              </div>
            </div>

            <div className="panel scroll" style={{ flex: 1, minWidth: '300px', maxWidth: '550px', maxHeight: '550px', overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
              <Section title="🎭 PRESETS">
                {Object.entries(presets).map(([k, v]) => <OptionBtn key={k} onClick={() => applyPreset(k)}>{v.name}</OptionBtn>)}
              </Section>
              <Section title="🎨 BACKGROUND">
                {Object.entries(backgrounds).map(([k, v]) => <OptionBtn key={k} active={bg === k} onClick={() => setBg(k)}>{v.name}</OptionBtn>)}
              </Section>
              <Section title="👤 SKIN">
                {skinColors.map(c => <ColorBtn key={c.color} active={skinColor === c.color} onClick={() => setSkinColor(c.color)} color={c.color} />)}
              </Section>
              <Section title="💇 HAIR STYLE">
                {hairStyles.map(h => <OptionBtn key={h.id} active={hairStyle === h.id} onClick={() => setHairStyle(h.id)}>{h.name}</OptionBtn>)}
              </Section>
              <Section title="🎨 HAIR COLOR">
                {hairColors.map(c => <ColorBtn key={c.color} active={hairColor === c.color} onClick={() => setHairColor(c.color)} color={c.color} />)}
              </Section>
              <Section title="👀 EYES">
                {eyeStyles.map(e => <OptionBtn key={e.id} active={eyeStyle === e.id} onClick={() => setEyeStyle(e.id)}>{e.name}</OptionBtn>)}
              </Section>
              <Section title="👄 MOUTH">
                {mouthStyles.map(m => <OptionBtn key={m.id} active={mouthStyle === m.id} onClick={() => setMouthStyle(m.id)}>{m.name}</OptionBtn>)}
              </Section>
              <Section title="🕶️ ACCESSORIES">
                {accessories.map(a => <OptionBtn key={a.id || 'none'} active={accessory === a.id} onClick={() => setAccessory(a.id)}>{a.name}</OptionBtn>)}
              </Section>
              <Section title="🎩 HATS">
                {hats.map(h => <OptionBtn key={h.id || 'none'} active={hat === h.id} onClick={() => setHat(h.id)}>{h.name}</OptionBtn>)}
              </Section>
              <Section title="🔫 ITEMS">
                {items.map(i => <OptionBtn key={i.id || 'none'} active={item === i.id} onClick={() => setItem(i.id)}>{i.name}</OptionBtn>)}
              </Section>
              <Section title="✨ EFFECTS">
                {effects.map(e => <OptionBtn key={e.id || 'none'} active={effect === e.id} onClick={() => setEffect(e.id)}>{e.name}</OptionBtn>)}
              </Section>
            </div>
          </div>
        ) : showMarketplace ? (
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ fontFamily: "'Press Start 2P'", fontSize: '12px', color: '#00ff88' }}>🏪 MARKETPLACE</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className="action-btn" onClick={() => setViewMode('all')} 
                  style={{ background: viewMode === 'all' ? '#00ff88' : '#333', color: viewMode === 'all' ? '#000' : '#fff', padding: '6px 12px', fontSize: '7px' }}>
                  ALL ({mintedNFTs.length})
                </button>
                <button className="action-btn" onClick={() => setViewMode('sale')} 
                  style={{ background: viewMode === 'sale' ? '#ff6b6b' : '#333', color: '#fff', padding: '6px 12px', fontSize: '7px' }}>
                  💰 FOR SALE ({mintedNFTs.filter(n => n.forSale).length})
                </button>
                {walletAddress && (
                  <button className="action-btn" onClick={() => setViewMode('mine')} 
                    style={{ background: viewMode === 'mine' ? '#ab47bc' : '#333', color: '#fff', padding: '6px 12px', fontSize: '7px' }}>
                    MY NFTs ({mintedNFTs.filter(n => n.owner === walletAddress).length})
                  </button>
                )}
              </div>
            </div>
            
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div className="pulse" style={{ fontSize: '40px' }}>⏳</div>
                <div style={{ fontFamily: "'Press Start 2P'", fontSize: '10px', marginTop: '15px' }}>Loading NFTs...</div>
              </div>
            ) : displayedNFTs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>
                <div style={{ fontSize: '40px', marginBottom: '15px' }}>🖼️</div>
                <div style={{ fontFamily: "'Press Start 2P'", fontSize: '10px' }}>
                  {viewMode === 'mine' ? 'You have no NFTs yet!' : viewMode === 'sale' ? 'No NFTs for sale!' : 'No NFTs minted yet!'}
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px' }}>
                {displayedNFTs.map(nft => (
                  <div key={nft.id} className="nft-card" style={{ border: `2px solid ${nft.owner === walletAddress ? '#ab47bc' : nft.forSale ? '#ff6b6b' : rarities[nft.rarity].color}` }}>
                    {nft.forSale && <div className="sale-badge">💰 {nft.price} SOL</div>}
                    <img src={nft.image} alt={`NFT #${nft.serialNumber}`} style={{ width: '100%', borderRadius: '6px', imageRendering: 'pixelated' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                      <span style={{ fontFamily: "'Press Start 2P'", fontSize: '10px' }}>#{nft.serialNumber}</span>
                      <RarityBadge rarity={nft.rarity} />
                    </div>
                    <div style={{ fontFamily: "'Press Start 2P'", fontSize: '14px', color: rarities[nft.rarity].color, textAlign: 'center', marginTop: '8px' }}>{nft.score}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', marginTop: '8px' }}>
                      <span style={{ fontSize: '12px' }}>👻</span>
                      <span style={{ fontSize: '9px', color: nft.owner === walletAddress ? '#ab47bc' : '#888' }}>
                        {nft.owner === walletAddress ? 'YOU' : shortAddress(nft.owner)}
                      </span>
                    </div>
                    
                    {/* Action buttons */}
                    <div style={{ marginTop: '10px' }}>
                      {nft.owner === walletAddress ? (
                        // Owner actions
                        nft.forSale ? (
                          <button className="action-btn" onClick={() => cancelListing(nft)} 
                            style={{ width: '100%', background: '#444', color: '#fff', padding: '8px', fontSize: '7px' }}>
                            ❌ Cancel Listing
                          </button>
                        ) : (
                          <button className="action-btn" onClick={() => { setSelectedNFT(nft); setShowSellModal(true); }} 
                            style={{ width: '100%', background: 'linear-gradient(135deg, #ff6b6b, #ee5a5a)', color: '#fff', padding: '8px', fontSize: '7px' }}>
                            💰 Sell NFT
                          </button>
                        )
                      ) : (
                        // Buyer actions
                        nft.forSale && (
                          <button className="action-btn" onClick={() => buyNFT(nft)} 
                            style={{ width: '100%', background: 'linear-gradient(135deg, #00ff88, #00aa55)', color: '#000', padding: '8px', fontSize: '7px' }}>
                            🛒 Buy for {nft.price} SOL
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* BOT DASHBOARD */
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ fontFamily: "'Press Start 2P'", fontSize: '12px', color: '#ff6b6b' }}>🤖 MM BOT TREASURY</div>
              <button 
                className="action-btn" 
                onClick={() => { fetchBotBalance(); fetchBotTransactions(); }}
                style={{ background: '#333', color: '#fff', padding: '6px 12px', fontSize: '7px' }}
              >
                🔄 REFRESH
              </button>
            </div>

            {CONFIG.BOT_WALLET === "YOUR_BOT_WALLET_HERE" ? (
              <div style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>
                <div style={{ fontSize: '40px', marginBottom: '15px' }}>⚙️</div>
                <div style={{ fontFamily: "'Press Start 2P'", fontSize: '10px' }}>Configure BOT_WALLET in code</div>
              </div>
            ) : (
              <>
                {/* Stats Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                  <div style={{ background: 'rgba(0,255,136,0.1)', border: '2px solid #00ff88', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Press Start 2P'", fontSize: '7px', color: '#888', marginBottom: '8px' }}>💰 BALANCE</div>
                    <div style={{ fontFamily: "'Press Start 2P'", fontSize: '16px', color: '#00ff88' }}>
                      {botBalance !== null ? `${botBalance.toFixed(4)}` : '...'} 
                    </div>
                    <div style={{ fontFamily: "'Press Start 2P'", fontSize: '8px', color: '#888', marginTop: '4px' }}>SOL</div>
                  </div>
                  
                  <div style={{ background: 'rgba(255,107,107,0.1)', border: '2px solid #ff6b6b', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Press Start 2P'", fontSize: '7px', color: '#888', marginBottom: '8px' }}>📊 TRADES</div>
                    <div style={{ fontFamily: "'Press Start 2P'", fontSize: '16px', color: '#ff6b6b' }}>
                      {botTransactions.length}
                    </div>
                    <div style={{ fontFamily: "'Press Start 2P'", fontSize: '8px', color: '#888', marginTop: '4px' }}>RECENT</div>
                  </div>
                  
                  <div style={{ background: 'rgba(171,71,188,0.1)', border: '2px solid #ab47bc', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Press Start 2P'", fontSize: '7px', color: '#888', marginBottom: '8px' }}>🔗 WALLET</div>
                    <div style={{ fontFamily: "'Press Start 2P'", fontSize: '8px', color: '#ab47bc', wordBreak: 'break-all' }}>
                      {CONFIG.BOT_WALLET.slice(0, 4)}...{CONFIG.BOT_WALLET.slice(-4)}
                    </div>
                    <a 
                      href={`https://solscan.io/account/${CONFIG.BOT_WALLET}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ fontFamily: "'Press Start 2P'", fontSize: '6px', color: '#00ff88', marginTop: '4px', display: 'block' }}
                    >
                      VIEW ON SOLSCAN ↗
                    </a>
                  </div>
                </div>

                {/* Recent Activity */}
                <div style={{ fontFamily: "'Press Start 2P'", fontSize: '10px', color: '#fff', marginBottom: '15px' }}>📜 RECENT ACTIVITY</div>
                
                {botLoading ? (
                  <div style={{ textAlign: 'center', padding: '30px' }}>
                    <div className="pulse" style={{ fontSize: '30px' }}>⏳</div>
                    <div style={{ fontFamily: "'Press Start 2P'", fontSize: '8px', marginTop: '10px' }}>Loading transactions...</div>
                  </div>
                ) : botTransactions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', opacity: 0.5 }}>
                    <div style={{ fontSize: '30px', marginBottom: '10px' }}>📭</div>
                    <div style={{ fontFamily: "'Press Start 2P'", fontSize: '8px' }}>No recent transactions</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                    {botTransactions.map((tx, index) => (
                      <div 
                        key={tx.signature} 
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          background: 'rgba(0,0,0,0.3)',
                          borderRadius: '6px',
                          padding: '10px 12px',
                          borderLeft: `3px solid ${tx.type === 'BUY' ? '#00ff88' : tx.type === 'SELL' ? '#ff6b6b' : '#888'}`
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '16px' }}>
                            {tx.type === 'BUY' ? '🟢' : tx.type === 'SELL' ? '🔴' : '⚪'}
                          </span>
                          <div>
                            <div style={{ fontFamily: "'Press Start 2P'", fontSize: '8px', color: tx.type === 'BUY' ? '#00ff88' : tx.type === 'SELL' ? '#ff6b6b' : '#888' }}>
                              {tx.type}
                            </div>
                            <div style={{ fontFamily: "'Press Start 2P'", fontSize: '10px', color: '#fff', marginTop: '2px' }}>
                              {tx.amount} SOL
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: "'Press Start 2P'", fontSize: '7px', color: '#888' }}>
                            {timeAgo(tx.time)}
                          </div>
                          <a 
                            href={`https://solscan.io/tx/${tx.signature}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontFamily: "'Press Start 2P'", fontSize: '6px', color: '#00ff88' }}
                          >
                            TX ↗
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {generatedLore && !showMarketplace && !showBotDashboard && (
          <div className="panel" style={{ marginTop: '15px', textAlign: 'center' }}>
            <pre style={{ fontFamily: "'Press Start 2P'", fontSize: '8px', whiteSpace: 'pre-wrap', lineHeight: '1.8', color: '#aaa' }}>{generatedLore}</pre>
            <button className="action-btn" onClick={() => navigator.clipboard.writeText(generatedLore)} style={{ marginTop: '10px', background: '#333', color: '#00ff88', border: '1px solid #00ff88' }}>📋 COPY</button>
          </div>
        )}

        {mintError && <div style={{ background: 'rgba(255,0,0,0.2)', border: '2px solid #ff4444', borderRadius: '8px', padding: '12px', marginTop: '15px', textAlign: 'center', fontFamily: "'Press Start 2P'", fontSize: '8px', color: '#ff4444' }}>{mintError}</div>}
        {mintSuccess && <div style={{ background: 'rgba(0,255,0,0.2)', border: '2px solid #00ff88', borderRadius: '8px', padding: '12px', marginTop: '15px', textAlign: 'center', fontFamily: "'Press Start 2P'", fontSize: '8px', color: '#00ff88' }}>{mintSuccess}</div>}

        {/* Mint Modal */}
        {showCard && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowCard(false)}>
            <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #2a2a4e)', border: '3px solid #ab47bc', borderRadius: '12px', padding: '20px', maxWidth: '340px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
              <div style={{ fontFamily: "'Press Start 2P'", fontSize: '12px', color: '#ab47bc', marginBottom: '15px' }}>👻 MINT NFT</div>
              <div style={{ background: backgrounds[bg]?.color || '#333', borderRadius: '8px', padding: '10px', marginBottom: '15px' }}>
                <img src={mintPreviewImage} alt="NFT Preview" style={{ width: '100%', borderRadius: '6px', imageRendering: 'pixelated' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <span style={{ fontFamily: "'Press Start 2P'", fontSize: '10px' }}>#{(mintedNFTs.length + 1).toString().padStart(5, '0')}</span>
                <RarityBadge rarity={getOverallRarity()} />
              </div>
              <div style={{ background: 'rgba(171, 71, 188, 0.2)', borderRadius: '6px', padding: '10px', marginBottom: '15px' }}>
                <div style={{ fontSize: '10px', color: '#888' }}>Minting to:</div>
                <div style={{ fontFamily: "'Press Start 2P'", fontSize: '9px', color: '#ab47bc', marginTop: '5px' }}>{shortAddress(walletAddress)}</div>
              </div>
              <div style={{ fontFamily: "'Press Start 2P'", fontSize: '18px', color: rarities[getOverallRarity()].color, marginBottom: '10px' }}>SCORE: {getRarityScore()}</div>
              <div style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid #00ff88', borderRadius: '6px', padding: '8px', marginBottom: '15px' }}>
                <div style={{ fontFamily: "'Press Start 2P'", fontSize: '8px', color: '#00ff88' }}>💰 MINT PRICE: {CONFIG.MINT_PRICE} SOL</div>
              </div>
              {isAlreadyMinted() ? (
                <div style={{ background: 'rgba(255,0,0,0.2)', border: '2px solid #ff4444', borderRadius: '8px', padding: '10px', marginBottom: '15px' }}>
                  <div style={{ fontFamily: "'Press Start 2P'", fontSize: '8px', color: '#ff4444' }}>⚠️ ALREADY EXISTS!</div>
                </div>
              ) : (
                <button className="action-btn" onClick={mintNFT} disabled={isMinting}
                  style={{ width: '100%', background: 'linear-gradient(135deg, #ab47bc, #7c4dff)', color: '#fff', padding: '15px' }}>
                  {isMinting ? <><span className="pulse">⏳</span> Minting...</> : `✨ MINT (${CONFIG.MINT_PRICE} SOL)`}
                </button>
              )}
              <button className="action-btn" onClick={() => setShowCard(false)} style={{ width: '100%', marginTop: '10px', background: '#333', color: '#fff' }}>❌ CANCEL</button>
            </div>
          </div>
        )}

        {/* Sell Modal */}
        {showSellModal && selectedNFT && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowSellModal(false)}>
            <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #2a2a4e)', border: '3px solid #ff6b6b', borderRadius: '12px', padding: '20px', maxWidth: '340px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
              <div style={{ fontFamily: "'Press Start 2P'", fontSize: '12px', color: '#ff6b6b', marginBottom: '15px' }}>💰 SELL NFT</div>
              <img src={selectedNFT.image} alt="NFT" style={{ width: '150px', borderRadius: '8px', imageRendering: 'pixelated', marginBottom: '15px' }} />
              <div style={{ fontFamily: "'Press Start 2P'", fontSize: '10px', marginBottom: '15px' }}>#{selectedNFT.serialNumber}</div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontFamily: "'Press Start 2P'", fontSize: '8px', color: '#888', display: 'block', marginBottom: '8px' }}>Price in SOL:</label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0.01"
                  value={sellPrice} 
                  onChange={(e) => setSellPrice(e.target.value)}
                  placeholder="0.00"
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    border: '2px solid #ff6b6b', 
                    background: 'rgba(0,0,0,0.5)', 
                    color: '#fff', 
                    fontFamily: "'Press Start 2P'", 
                    fontSize: '14px',
                    textAlign: 'center'
                  }} 
                />
              </div>
              
              <button className="action-btn" onClick={listForSale} 
                style={{ width: '100%', background: 'linear-gradient(135deg, #ff6b6b, #ee5a5a)', color: '#fff', padding: '15px' }}>
                📋 LIST FOR SALE
              </button>
              <button className="action-btn" onClick={() => { setShowSellModal(false); setSelectedNFT(null); setSellPrice(''); }} 
                style={{ width: '100%', marginTop: '10px', background: '#333', color: '#fff' }}>
                ❌ CANCEL
              </button>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div style={{ marginTop: '40px', paddingTop: '30px', borderTop: '2px solid rgba(0,255,136,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '25px' }}>
            <a href={CONFIG.TWITTER_URL} target="_blank" rel="noopener noreferrer" className="social-btn" title="Follow us on X">
              <TwitterIcon />
            </a>
            <a href={CONFIG.DEXSCREENER_URL} target="_blank" rel="noopener noreferrer" className="social-btn" title="View on DexScreener">
              <DexScreenerIcon />
            </a>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontFamily: "'Press Start 2P'", fontSize: '8px', color: '#00ff88', marginBottom: '10px' }}>📜 CONTRACT ADDRESS</div>
            <div onClick={copyContract}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.4)', border: '2px solid rgba(0,255,136,0.3)', borderRadius: '8px', padding: '12px 20px', cursor: 'pointer', transition: 'all 0.3s' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#888', wordBreak: 'break-all' }}>{CONFIG.CONTRACT_ADDRESS}</span>
              <span style={{ fontSize: '14px' }}>{copied ? '✅' : '📋'}</span>
            </div>
            {copied && <div style={{ fontFamily: "'Press Start 2P'", fontSize: '7px', color: '#00ff88', marginTop: '8px' }}>Copied!</div>}
          </div>

          <div style={{ textAlign: 'center', fontFamily: "'Press Start 2P'", fontSize: '7px', opacity: 0.3 }}>
            POWERED BY SOLANA 👾 {mintedNFTs.length} MINTED
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
