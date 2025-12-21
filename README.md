# 👾 DEGEN CULT - Pixel PFP Maker

## 🚀 Deploy su Vercel (2 minuti!)

### Metodo 1: Upload diretto (più facile)
1. Vai su [vercel.com](https://vercel.com) e fai login (o registrati gratis)
2. Clicca "Add New Project"
3. Clicca "Upload" e trascina questa cartella
4. Aspetta il deploy (1-2 minuti)
5. Il tuo sito è live! 🎉

### Metodo 2: Via GitHub
1. Crea un repo su GitHub
2. Uploada questi file
3. Su Vercel, importa il repo
4. Deploy automatico!

---

## ⚙️ CONFIGURAZIONE

Apri `src/App.js` e modifica queste righe (circa riga 25):

```javascript
const CONFIG = {
  TWITTER_URL: "https://x.com/IL_TUO_TWITTER",
  DEXSCREENER_URL: "https://dexscreener.com/solana/IL_TUO_TOKEN",
  CONTRACT_ADDRESS: "IL_TUO_CONTRACT_ADDRESS",
};
```

---

## 📁 Struttura file

```
degen-cult-vercel/
├── public/
│   └── index.html
├── src/
│   ├── App.js      ← Qui modifichi i link!
│   └── index.js
├── package.json
└── README.md
```

---

## 🔧 Test locale (opzionale)

```bash
npm install
npm start
```

Il sito sarà su http://localhost:3000

---

Made with 👾 by DEGEN CULT
