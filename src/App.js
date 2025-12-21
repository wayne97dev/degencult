import React, { useState, useRef, useEffect } from 'react';

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
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [animEnabled, setAnimEnabled] = useState(true);
  const [animFrame, setAnimFrame] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [generatedLore, setGeneratedLore] = useState('');
  const [mintedNFTs, setMintedNFTs] = useState([]);
  const [mintError, setMintError] = useState('');
  const [mintSuccess, setMintSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('all');
  const [copied, setCopied] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeSection, setActiveSection] = useState('presets');

  // ═══════════════════════════════════════════════════════════════
  // ⚙️ CONFIGURAZIONE - MODIFICA QUI I TUOI LINK!
  // ═══════════════════════════════════════════════════════════════
  const CONFIG = {
    TWITTER_URL: "https://x.com/YOUR_TWITTER_HERE",
    DEXSCREENER_URL: "https://dexscreener.com/solana/YOUR_TOKEN_HERE",
    CONTRACT_ADDRESS: "YOUR_CONTRACT_ADDRESS_HERE",
  };
  // ═══════════════════════════════════════════════════════════════

  // Wallet State
  const [walletAddress, setWalletAddress] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletError, setWalletError] = useState('');

  const P = 5;

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Copy contract address
  const copyContract = () => {
    navigator.clipboard.writeText(CONFIG.CONTRACT_ADDRESS);
    setCopied(true);
    playSound('select');
    setTimeout(() => setCopied(false), 2000);
  };

  // Check if Phantom is installed
  const getPhantomProvider = () => {
    if (typeof window !== 'undefined' && window.solana?.isPhantom) {
      return window.solana;
    }
    return null;
  };

  // Connect Phantom Wallet
  const connectWallet = async () => {
    setWalletError('');
    setIsConnecting(true);
    
    try {
      const provider = getPhantomProvider();
      
      if (!provider) {
        setWalletError('Phantom wallet not found! Install from phantom.app');
        setIsConnecting(false);
        return;
      }

      const response = await provider.connect();
      const address = response.publicKey.toString();
      setWalletAddress(address);
      playSound('mint');
      
      localStorage.setItem('degenCultWallet', address);
    } catch (err) {
      if (err.code === 4001) {
        setWalletError('Connection rejected');
      } else {
        setWalletError('Failed to connect');
      }
    }
    
    setIsConnecting(false);
  };

  // Disconnect wallet
  const disconnectWallet = async () => {
    try {
      const provider = getPhantomProvider();
      if (provider) {
        await provider.disconnect();
      }
    } catch (err) {}
    setWalletAddress(null);
    localStorage.removeItem('degenCultWallet');
    playSound('click');
  };

  // Check for existing connection on load
  useEffect(() => {
    const checkWallet = async () => {
      const savedWallet = localStorage.getItem('degenCultWallet');
      const provider = getPhantomProvider();
      
      if (provider && savedWallet) {
        try {
          const response = await provider.connect({ onlyIfTrusted: true });
          setWalletAddress(response.publicKey.toString());
        } catch (err) {
          localStorage.removeItem('degenCultWallet');
        }
      }
    };
    
    checkWallet();
  }, []);

  // Load NFTs from localStorage
  useEffect(() => {
    setIsLoading(true);
    try {
      const saved = localStorage.getItem('degenCultNFTs');
      if (saved) {
        setMintedNFTs(JSON.parse(saved));
      }
    } catch (err) {
      setMintedNFTs([]);
    }
    setIsLoading(false);
  }, []);

  // Save NFTs to localStorage
  const saveNFTs = (nfts) => {
    try {
      localStorage.setItem('degenCultNFTs', JSON.stringify(nfts));
    } catch (err) {
      console.error('Failed to save NFTs:', err);
    }
  };

  // Generate unique hash for current config
  const getConfigHash = () => {
    return `${bg}-${skinColor}-${hairStyle}-${hairColor}-${eyeStyle}-${mouthStyle}-${accessory}-${hat}-${item}-${effect}`;
  };

  // Check if current config is already minted
  const isAlreadyMinted = () => {
    return mintedNFTs.some(nft => nft.hash === getConfigHash());
  };

  // Get shortened wallet address
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
    { id: 'party', name: '🎉 Party' }, { id: 'cat_ears', name: '🐱 Cat' },
    { id: 'bunny_ears', name: '🐰 Bunny' }, { id: 'antenna', name: '👽 Alien' },
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

  // Mobile sections for tabs
  const sections = [
    { id: 'presets', name: '🎭', data: presets, type: 'preset' },
    { id: 'bg', name: '🎨', data: backgrounds, type: 'bg' },
    { id: 'skin', name: '👤', data: skinColors, type: 'color', setter: setSkinColor, current: skinColor },
    { id: 'hair', name: '💇', data: hairStyles, type: 'style', setter: setHairStyle, current: hairStyle },
    { id: 'hairColor', name: '🎨', data: hairColors, type: 'color', setter: setHairColor, current: hairColor },
    { id: 'eyes', name: '👀', data: eyeStyles, type: 'style', setter: setEyeStyle, current: eyeStyle },
    { id: 'mouth', name: '👄', data: mouthStyles, type: 'style', setter: setMouthStyle, current: mouthStyle },
    { id: 'acc', name: '🕶️', data: accessories, type: 'style', setter: setAccessory, current: accessory },
    { id: 'hats', name: '🎩', data: hats, type: 'style', setter: setHat, current: hat },
    { id: 'items', name: '🔫', data: items, type: 'style', setter: setItem, current: item },
    { id: 'fx', name: '✨', data: effects, type: 'style', setter: setEffect, current: effect },
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
    if (hat === 'cap') { pxRect(ctx, cx - 40, topY, 80, P * 5, '#222'); pxRect(ctx, cx - 35, topY - P * 4, 70, P * 4, '#222'); pxRect(ctx, cx - 55, topY + P * 2, P * 7, P * 4, '#222'); }
    if (hat === 'crown') { pxRect(ctx, cx - 35, topY, 70, P * 4, '#ffd700'); [-30, -15, 0, 15, 30].forEach((x, i) => pxRect(ctx, cx + x - P, topY - (i % 2 === 0 ? P * 5 : P * 7), P * 3, i % 2 === 0 ? P * 5 : P * 7, '#ffd700')); }
    if (hat === 'halo') for (let angle = 0; angle < Math.PI * 2; angle += 0.35) pxRect(ctx, cx + Math.cos(angle) * 40 - P, topY - 25 + Math.sin(angle) * 10 - P, P * 2, P * 2, '#ffd700');
    if (hat === 'horns') for (let i = 0; i < 7; i++) { pxRect(ctx, cx - 50 - i * P, topY - i * P * 4, P * 3, P * 4, '#aa2222'); pxRect(ctx, cx + 42 + i * P, topY - i * P * 4, P * 3, P * 4, '#aa2222'); }
    if (hat === 'wizard') { for (let i = 0; i < 12; i++) pxRect(ctx, cx - Math.max(P, 30 - i * 5)/2, topY - i * P * 4, Math.max(P * 2, 60 - i * 10), P * 4, '#4400aa'); pxRect(ctx, cx - 40, topY + P, 80, P * 2, '#ffd700'); }
    if (hat === 'party') for (let i = 0; i < 10; i++) pxRect(ctx, cx - Math.max(P, 22 - i * 4)/2, topY - i * P * 4, Math.max(P * 2, 45 - i * 8), P * 4, ['#ff3366', '#33ff66', '#3366ff', '#ffff33'][i % 4]);
    if (hat === 'cat_ears') for (let i = 0; i < 5; i++) { pxRect(ctx, cx - 40 + i * P, topY - P * 5 - i * P * 3, P * 3, P * 3, skinColor); pxRect(ctx, cx + 28 - i * P, topY - P * 5 - i * P * 3, P * 3, P * 3, skinColor); }

    const ix = cx + 60, iy = charY + 25;
    if (item === 'joint') { pxRect(ctx, cx + 30, charY + 12, P * 12, P * 2, '#f5f5dc'); pxRect(ctx, cx + 72, charY + 10, P * 3, P * 3, '#ff4500'); }
    if (item === 'chain') { for (let i = 0; i < 16; i++) pxRect(ctx, cx - 45 + i * 6, charY + 45 + Math.sin(i * 0.5) * 8, P * 2, P * 2, '#ffd700'); pxRect(ctx, cx - P * 4, charY + 60, P * 8, P * 8, '#ffd700'); }
    if (item === 'coffee') { pxRect(ctx, ix, iy, P * 6, P * 10, '#fff'); pxRect(ctx, ix + P, iy + P, P * 4, P * 4, '#4a2c00'); }
    if (item === 'sword') { pxRect(ctx, ix, iy - P * 15, P * 2, P * 25, '#aaa'); pxRect(ctx, ix - P * 2, iy + P * 6, P * 6, P * 2, '#8b4513'); }
    if (item === 'controller') { pxRect(ctx, ix, iy, P * 10, P * 6, '#333'); px(ctx, ix + P * 2, iy + P * 2, '#ff0000'); }

    if (effect === 'sparkle') for (let i = 0; i < 15; i++) pxRect(ctx, (animFrame * 7 + i * 47) % W, (i * 31) % H, P * 2, P * 2, '#fff');
    if (effect === 'hearts') for (let i = 0; i < 8; i++) px(ctx, (animFrame * 3 + i * 50) % W, (H - (animFrame * 2 + i * 40) % H), '#ff4488');
    if (effect === 'fire') for (let i = 0; i < 15; i++) pxRect(ctx, cx - 50 + (i * 17) % 100, H - 20 - (animFrame * 3 + i * 13) % 80, P * 3, P * 4, ['#ff0000', '#ff4400', '#ffaa00'][i % 3]);
    if (effect === 'money_rain') for (let i = 0; i < 12; i++) pxRect(ctx, (i * 37) % W, (animFrame * 4 + i * 30) % H, P * 3, P * 2, '#44aa44');
    if (effect === 'lightning' && animFrame % 10 < 3) pxRect(ctx, cx + 50, charY - 80, P * 3, P * 10, '#ffff00');
    if (effect === 'snow') for (let i = 0; i < 20; i++) px(ctx, (i * 23) % W, (animFrame * 2 + i * 17) % H, '#fff');

  }, [bg, skinColor, hairStyle, hairColor, eyeStyle, mouthStyle, accessory, hat, item, effect, animFrame, animEnabled]);

  // Mint NFT
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
      setMintError('⚠️ This combination already exists!');
      return;
    }

    const canvas = canvasRef.current;
    const imageData = canvas.toDataURL('image/png');
    const serialNumber = (mintedNFTs.length + 1).toString().padStart(5, '0');
    const score = getRarityScore();

    const newNFT = {
      id: serialNumber,
      hash: getConfigHash(),
      image: imageData,
      config: { bg, skinColor, hairStyle, hairColor, eyeStyle, mouthStyle, accessory, hat, item, effect },
      score,
      rarity: getOverallRarity(score),
      owner: walletAddress,
      mintedAt: new Date().toISOString(),
    };

    const updatedNFTs = [...mintedNFTs, newNFT];
    setMintedNFTs(updatedNFTs);
    saveNFTs(updatedNFTs);
    
    playSound('mint');
    setMintSuccess(`🎉 NFT #${serialNumber} minted!`);
    setShowCard(false);
  };

  const downloadPNG = () => {
    playSound('special');
    const link = document.createElement('a');
    link.href = canvasRef.current.toDataURL('image/png');
    link.download = `degen-cult-${Date.now()}.png`;
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

  const displayedNFTs = viewMode === 'mine' 
    ? mintedNFTs.filter(nft => nft.owner === walletAddress)
    : mintedNFTs;

  // UI Components
  const OptionBtn = ({ active, onClick, children, small }) => (
    <button type="button" onClick={(e) => { e.preventDefault(); onClick(); playSound('select'); }}
      style={{ 
        padding: small ? '8px 12px' : (isMobile ? '12px 14px' : '6px 10px'), 
        background: active ? 'linear-gradient(135deg, #00ff88, #00aa55)' : 'rgba(255,255,255,0.1)', 
        border: `2px solid ${active ? '#00ff88' : 'rgba(255,255,255,0.2)'}`, 
        borderRadius: '6px', 
        color: active ? '#000' : '#fff', 
        fontSize: isMobile ? '12px' : '10px', 
        fontWeight: '600', 
        cursor: 'pointer',
        minWidth: isMobile ? '70px' : 'auto',
        touchAction: 'manipulation',
      }}
    >{children}</button>
  );

  const ColorBtn = ({ active, onClick, color }) => (
    <button type="button" onClick={(e) => { e.preventDefault(); onClick(); playSound('select'); }}
      style={{ 
        width: isMobile ? '44px' : '28px', 
        height: isMobile ? '44px' : '28px', 
        background: color, 
        border: `3px solid ${active ? '#00ff88' : 'rgba(255,255,255,0.2)'}`, 
        borderRadius: '6px', 
        cursor: 'pointer', 
        boxShadow: active ? '0 0 10px rgba(0,255,136,0.5)' : 'none',
        touchAction: 'manipulation',
      }}
    />
  );

  const RarityBadge = ({ rarity }) => (
    <span style={{ padding: '4px 10px', background: rarities[rarity].color, borderRadius: '4px', fontSize: isMobile ? '10px' : '9px', fontWeight: 'bold', color: '#fff' }}>{rarities[rarity].name}</span>
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

  // Mobile section renderer
  const renderMobileSection = () => {
    const section = sections.find(s => s.id === activeSection);
    if (!section) return null;

    if (section.type === 'preset') {
      return (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {Object.entries(section.data).map(([k, v]) => (
            <OptionBtn key={k} onClick={() => applyPreset(k)}>{v.name}</OptionBtn>
          ))}
        </div>
      );
    }

    if (section.type === 'bg') {
      return (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {Object.entries(section.data).map(([k, v]) => (
            <OptionBtn key={k} active={bg === k} onClick={() => setBg(k)}>{v.name}</OptionBtn>
          ))}
        </div>
      );
    }

    if (section.type === 'color') {
      return (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {section.data.map(c => (
            <ColorBtn key={c.color} active={section.current === c.color} onClick={() => section.setter(c.color)} color={c.color} />
          ))}
        </div>
      );
    }

    if (section.type === 'style') {
      return (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {section.data.map(item => (
            <OptionBtn key={item.id || 'none'} active={section.current === item.id} onClick={() => section.setter(item.id)}>{item.name}</OptionBtn>
          ))}
        </div>
      );
    }
  };

  // Desktop section component
  const Section = ({ title, children }) => (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ fontFamily: "'Press Start 2P'", fontSize: '8px', color: '#00ff88', marginBottom: '6px' }}>{title}</div>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>{children}</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a1a 100%)', fontFamily: 'system-ui', color: '#fff', padding: isMobile ? '10px' : '15px', paddingBottom: isMobile ? '20px' : '15px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        html, body { overflow-x: hidden; }
        .title { font-family: 'Press Start 2P'; text-shadow: 0 0 10px #00ff88, 0 0 20px #00ff88; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        .float { animation: float 3s ease-in-out infinite; }
        .panel { background: rgba(0,255,136,0.03); border: 2px solid rgba(0,255,136,0.2); border-radius: 8px; padding: ${isMobile ? '10px' : '12px'}; }
        .scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .scroll::-webkit-scrollbar-thumb { background: rgba(0,255,136,0.4); border-radius: 3px; }
        .action-btn { 
          padding: ${isMobile ? '14px 16px' : '10px 16px'}; 
          font-family: 'Press Start 2P'; 
          font-size: ${isMobile ? '9px' : '8px'}; 
          border: none; 
          border-radius: 8px; 
          cursor: pointer; 
          transition: all 0.2s;
          touch-action: manipulation;
          -webkit-user-select: none;
          user-select: none;
        }
        .action-btn:hover { transform: translateY(-2px); }
        .action-btn:active { transform: scale(0.95); }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        .pulse { animation: pulse 2s infinite; }
        .social-btn { 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          width: ${isMobile ? '56px' : '50px'}; 
          height: ${isMobile ? '56px' : '50px'}; 
          border-radius: 12px; 
          border: 2px solid rgba(255,255,255,0.2); 
          background: rgba(255,255,255,0.05); 
          cursor: pointer; 
          transition: all 0.3s; 
          color: #888; 
          text-decoration: none;
          touch-action: manipulation;
        }
        .social-btn:hover, .social-btn:active { border-color: #00ff88; color: #00ff88; }
        .tab-btn {
          padding: ${isMobile ? '12px 8px' : '8px 12px'};
          background: rgba(255,255,255,0.05);
          border: none;
          border-bottom: 3px solid transparent;
          color: #666;
          font-size: ${isMobile ? '18px' : '14px'};
          cursor: pointer;
          transition: all 0.2s;
          flex: 1;
          min-width: 0;
          touch-action: manipulation;
        }
        .tab-btn.active {
          color: #00ff88;
          border-bottom-color: #00ff88;
          background: rgba(0,255,136,0.1);
        }
      `}</style>

      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: isMobile ? '10px' : '15px' }}>
          <h1 className="title" style={{ fontSize: isMobile ? '16px' : '20px', margin: '0' }}>👾 DEGEN CULT 👾</h1>
          <p style={{ fontFamily: "'Press Start 2P'", fontSize: isMobile ? '6px' : '7px', opacity: 0.5, marginTop: '6px' }}>PIXEL PFP MAKER ON SOLANA</p>
        </div>

        {/* Wallet Connect */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: isMobile ? '10px' : '15px' }}>
          {!walletAddress ? (
            <button className="action-btn" onClick={connectWallet} disabled={isConnecting}
              style={{ background: 'linear-gradient(135deg, #ab47bc, #7c4dff)', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isConnecting ? <><span className="pulse">⏳</span> Connecting...</> : <>👻 Connect Phantom</>}
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ background: 'rgba(171, 71, 188, 0.2)', border: '2px solid #ab47bc', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px' }}>👻</span>
                <span style={{ fontFamily: "'Press Start 2P'", fontSize: isMobile ? '7px' : '8px', color: '#ab47bc' }}>{shortAddress(walletAddress)}</span>
              </div>
              <button className="action-btn" onClick={disconnectWallet} style={{ background: '#444', color: '#fff', padding: '8px 12px' }}>✖️</button>
            </div>
          )}
        </div>
        {walletError && <div style={{ textAlign: 'center', color: '#ff4444', fontSize: '10px', marginBottom: '10px' }}>{walletError}</div>}

        {/* Nav */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: isMobile ? '10px' : '15px' }}>
          <button className="action-btn" onClick={() => setShowMarketplace(false)} style={{ background: !showMarketplace ? '#00ff88' : '#333', color: !showMarketplace ? '#000' : '#fff', flex: isMobile ? 1 : 'none' }}>🎨 CREATE</button>
          <button className="action-btn" onClick={() => setShowMarketplace(true)} style={{ background: showMarketplace ? '#00ff88' : '#333', color: showMarketplace ? '#000' : '#fff', flex: isMobile ? 1 : 'none' }}>🏪 ({mintedNFTs.length})</button>
        </div>

        {!showMarketplace ? (
          // CREATE MODE
          isMobile ? (
            // MOBILE LAYOUT
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Canvas + Score Row */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
                <div className="panel" style={{ position: 'relative', flex: '0 0 auto' }}>
                  <canvas ref={canvasRef} width={280} height={280} style={{ display: 'block', borderRadius: '6px', imageRendering: 'pixelated', width: '140px', height: '140px' }} />
                  <div style={{ position: 'absolute', top: '8px', right: '8px' }}><RarityBadge rarity={getOverallRarity()} /></div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div className="panel" style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontFamily: "'Press Start 2P'", fontSize: '7px', color: '#00ff88' }}>⭐ SCORE</div>
                    <div style={{ fontFamily: "'Press Start 2P'", fontSize: '20px', color: rarities[getOverallRarity()].color }}>{getRarityScore()}</div>
                    {isAlreadyMinted() && <div style={{ fontFamily: "'Press Start 2P'", fontSize: '6px', color: '#ff4444', marginTop: '4px' }}>⚠️ MINTED</div>}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <button className="action-btn" onClick={randomize} style={{ background: 'linear-gradient(135deg, #9575CD, #64B5F6)', color: '#fff', padding: '10px 8px', fontSize: '8px' }}>🎲</button>
                    <button className="action-btn" onClick={downloadPNG} style={{ background: 'linear-gradient(135deg, #4CAF50, #45a049)', color: '#fff', padding: '10px 8px', fontSize: '8px' }}>⬇️</button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px' }}>
                <button className="action-btn" onClick={() => walletAddress ? setShowCard(true) : connectWallet()} 
                  style={{ background: walletAddress ? 'linear-gradient(135deg, #ff6b6b, #ee5a5a)' : 'linear-gradient(135deg, #ab47bc, #7c4dff)', color: '#fff', fontSize: '8px' }}>
                  {walletAddress ? '🎫 MINT' : '👻'}
                </button>
                <button className="action-btn" onClick={generateLore} style={{ background: 'linear-gradient(135deg, #a855f7, #9333ea)', color: '#fff', fontSize: '8px' }}>📜</button>
                <button className="action-btn" onClick={() => setAnimEnabled(!animEnabled)} style={{ background: animEnabled ? '#00aa55' : '#444', color: '#fff', fontSize: '8px' }}>{animEnabled ? '⏸️' : '▶️'}</button>
                <button className="action-btn" onClick={() => setSoundEnabled(!soundEnabled)} style={{ background: soundEnabled ? '#00aa55' : '#444', color: '#fff', fontSize: '8px' }}>{soundEnabled ? '🔊' : '🔇'}</button>
              </div>

              {/* Category Tabs */}
              <div style={{ display: 'flex', overflowX: 'auto', gap: '2px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '4px' }} className="scroll">
                {sections.map(s => (
                  <button key={s.id} className={`tab-btn ${activeSection === s.id ? 'active' : ''}`} onClick={() => { setActiveSection(s.id); playSound('click'); }}>
                    {s.name}
                  </button>
                ))}
              </div>

              {/* Options Panel */}
              <div className="panel" style={{ minHeight: '120px' }}>
                {renderMobileSection()}
              </div>
            </div>
          ) : (
            // DESKTOP LAYOUT
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
                  <button className="action-btn" onClick={() => walletAddress ? setShowCard(true) : connectWallet()} 
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

              <div className="panel scroll" style={{ flex: 1, minWidth: '300px', maxWidth: '550px', maxHeight: '550px', overflowY: 'auto' }}>
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
          )
        ) : (
          // MARKETPLACE
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ fontFamily: "'Press Start 2P'", fontSize: isMobile ? '10px' : '12px', color: '#00ff88' }}>🏪 MARKETPLACE</div>
              {walletAddress && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="action-btn" onClick={() => setViewMode('all')} style={{ background: viewMode === 'all' ? '#00ff88' : '#333', color: viewMode === 'all' ? '#000' : '#fff', padding: '8px 12px', fontSize: '7px' }}>ALL ({mintedNFTs.length})</button>
                  <button className="action-btn" onClick={() => setViewMode('mine')} style={{ background: viewMode === 'mine' ? '#ab47bc' : '#333', color: '#fff', padding: '8px 12px', fontSize: '7px' }}>MINE ({mintedNFTs.filter(n => n.owner === walletAddress).length})</button>
                </div>
              )}
            </div>
            
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div className="pulse" style={{ fontSize: '40px' }}>⏳</div>
              </div>
            ) : displayedNFTs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>
                <div style={{ fontSize: '40px', marginBottom: '15px' }}>🖼️</div>
                <div style={{ fontFamily: "'Press Start 2P'", fontSize: '10px' }}>No NFTs yet!</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(180px, 1fr))', gap: isMobile ? '10px' : '15px' }}>
                {displayedNFTs.map(nft => (
                  <div key={nft.id} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: isMobile ? '8px' : '12px', border: `2px solid ${nft.owner === walletAddress ? '#ab47bc' : rarities[nft.rarity].color}` }}>
                    <img src={nft.image} alt={`NFT #${nft.id}`} style={{ width: '100%', borderRadius: '6px', imageRendering: 'pixelated' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                      <span style={{ fontFamily: "'Press Start 2P'", fontSize: isMobile ? '8px' : '10px' }}>#{nft.id}</span>
                      <RarityBadge rarity={nft.rarity} />
                    </div>
                    <div style={{ fontFamily: "'Press Start 2P'", fontSize: isMobile ? '12px' : '14px', color: rarities[nft.rarity].color, textAlign: 'center', marginTop: '6px' }}>{nft.score}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '6px' }}>
                      <span style={{ fontSize: '10px' }}>👻</span>
                      <span style={{ fontSize: '8px', color: nft.owner === walletAddress ? '#ab47bc' : '#888' }}>
                        {nft.owner === walletAddress ? 'YOU' : shortAddress(nft.owner)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lore Display */}
        {generatedLore && !showMarketplace && (
          <div className="panel" style={{ marginTop: '15px', textAlign: 'center' }}>
            <pre style={{ fontFamily: "'Press Start 2P'", fontSize: isMobile ? '7px' : '8px', whiteSpace: 'pre-wrap', lineHeight: '1.8', color: '#aaa' }}>{generatedLore}</pre>
            <button className="action-btn" onClick={() => navigator.clipboard.writeText(generatedLore)} style={{ marginTop: '10px', background: '#333', color: '#00ff88', border: '1px solid #00ff88' }}>📋 COPY</button>
          </div>
        )}

        {/* Messages */}
        {mintError && <div style={{ background: 'rgba(255,0,0,0.2)', border: '2px solid #ff4444', borderRadius: '8px', padding: '12px', marginTop: '15px', textAlign: 'center', fontFamily: "'Press Start 2P'", fontSize: '8px', color: '#ff4444' }}>{mintError}</div>}
        {mintSuccess && <div style={{ background: 'rgba(0,255,0,0.2)', border: '2px solid #00ff88', borderRadius: '8px', padding: '12px', marginTop: '15px', textAlign: 'center', fontFamily: "'Press Start 2P'", fontSize: '8px', color: '#00ff88' }}>{mintSuccess}</div>}

        {/* Mint Modal */}
        {showCard && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={() => setShowCard(false)}>
            <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #2a2a4e)', border: '3px solid #ab47bc', borderRadius: '12px', padding: isMobile ? '15px' : '20px', maxWidth: '340px', width: '100%', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
              <div style={{ fontFamily: "'Press Start 2P'", fontSize: isMobile ? '10px' : '12px', color: '#ab47bc', marginBottom: '15px' }}>👻 MINT NFT</div>
              <div style={{ background: backgrounds[bg]?.color || '#333', borderRadius: '8px', padding: '10px', marginBottom: '15px' }}>
                <canvas ref={canvasRef} width={280} height={280} style={{ borderRadius: '6px', imageRendering: 'pixelated', width: '100%', maxWidth: '200px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <span style={{ fontFamily: "'Press Start 2P'", fontSize: '10px' }}>#{(mintedNFTs.length + 1).toString().padStart(5, '0')}</span>
                <RarityBadge rarity={getOverallRarity()} />
              </div>
              <div style={{ background: 'rgba(171, 71, 188, 0.2)', borderRadius: '6px', padding: '10px', marginBottom: '15px' }}>
                <div style={{ fontSize: '10px', color: '#888' }}>Minting to:</div>
                <div style={{ fontFamily: "'Press Start 2P'", fontSize: '8px', color: '#ab47bc', marginTop: '5px' }}>{shortAddress(walletAddress)}</div>
              </div>
              <div style={{ fontFamily: "'Press Start 2P'", fontSize: isMobile ? '16px' : '18px', color: rarities[getOverallRarity()].color, marginBottom: '15px' }}>SCORE: {getRarityScore()}</div>
              {isAlreadyMinted() ? (
                <div style={{ background: 'rgba(255,0,0,0.2)', border: '2px solid #ff4444', borderRadius: '8px', padding: '10px', marginBottom: '15px' }}>
                  <div style={{ fontFamily: "'Press Start 2P'", fontSize: '8px', color: '#ff4444' }}>⚠️ ALREADY EXISTS!</div>
                </div>
              ) : (
                <button className="action-btn" onClick={mintNFT} style={{ width: '100%', background: 'linear-gradient(135deg, #ab47bc, #7c4dff)', color: '#fff', padding: '15px' }}>✨ MINT NFT</button>
              )}
              <button className="action-btn" onClick={() => setShowCard(false)} style={{ width: '100%', marginTop: '10px', background: '#333', color: '#fff' }}>❌ CANCEL</button>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '2px solid rgba(0,255,136,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '20px' }}>
            <a href={CONFIG.TWITTER_URL} target="_blank" rel="noopener noreferrer" className="social-btn" title="Follow us on X">
              <TwitterIcon />
            </a>
            <a href={CONFIG.DEXSCREENER_URL} target="_blank" rel="noopener noreferrer" className="social-btn" title="View on DexScreener">
              <DexScreenerIcon />
            </a>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '15px' }}>
            <div style={{ fontFamily: "'Press Start 2P'", fontSize: '7px', color: '#00ff88', marginBottom: '8px' }}>📜 CONTRACT</div>
            <div onClick={copyContract}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.4)', border: '2px solid rgba(0,255,136,0.3)', borderRadius: '8px', padding: '10px 15px', cursor: 'pointer', maxWidth: '100%' }}>
              <span style={{ fontFamily: 'monospace', fontSize: isMobile ? '8px' : '11px', color: '#888', wordBreak: 'break-all' }}>{CONFIG.CONTRACT_ADDRESS}</span>
              <span style={{ fontSize: '12px', flexShrink: 0 }}>{copied ? '✅' : '📋'}</span>
            </div>
            {copied && <div style={{ fontFamily: "'Press Start 2P'", fontSize: '6px', color: '#00ff88', marginTop: '6px' }}>Copied!</div>}
          </div>

          <div style={{ textAlign: 'center', fontFamily: "'Press Start 2P'", fontSize: '6px', opacity: 0.3 }}>
            POWERED BY SOLANA 👾 {mintedNFTs.length} MINTED
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
