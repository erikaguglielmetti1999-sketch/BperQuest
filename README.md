# BPER QUEST

Un’avventura arcade isometrica in un borgo nella notte di Halloween. React 18 gestisce menu e HUD; Phaser 3.90 gestisce il mondo, gli sprite e le animazioni. TypeScript e Vite producono un sito completamente statico. Tutti i testi del gioco sono in italiano.

## Giocare

Apri il sito pubblicato e premi **INIZIA L’AVVENTURA**. Non servono account, download o installazioni per giocare.

- **WASD / frecce:** quattro direzioni logiche, proiettate in isometria. L’ultimo tasto direzionale premuto ha la precedenza; non esiste movimento diagonale.
- **Smartphone:** pulsanti ↖ ↗ ↙ ↘ a schermo, con rilascio e annullamento del tocco gestiti.
- **P / ESC / pulsante pausa:** sospendi e riprendi. Il gioco entra in pausa anche quando la pagina perde il focus o viene nascosta.
- **Pulsante audio:** attiva/disattiva musica ed effetti. L’audio inizia soltanto dopo il pulsante di avvio.
- I tesori si raccolgono automaticamente. Un solo tesoro dorato è attivo alla volta.
- Fulmine: +30% per 6 secondi, senza accumulare effetti. Lo scudo assorbe un colpo; nel livello finale ne trovi tre.
- Tre vite, due secondi di invulnerabilità dopo un contatto. Nessun attacco.
- Progressione: Piazza delle Zucche 3 oggetti → Parco delle Lanterne 3 → Torre della Mezzanotte 4. Le transizioni automatiche durano 2,5 secondi; vite, raccolta e tempo attivo persistono.
- **SALVA SCREENSHOT** scarica un PNG 1200×900 del risultato. Non vengono inviate email.

## Avvio per sviluppo

Serve Node.js 20 o successivo soltanto al computer dello sviluppatore. Dal terminale nella cartella `bper-quest`:

```sh
npm ci
npm run dev
```

Apri l’indirizzo indicato da Vite, normalmente `http://localhost:5173`. `npm run dev` espone anche l’indirizzo di rete locale per provare il gioco su uno smartphone nella stessa rete.

## Build e anteprima

```sh
npm run lint
npm test
npm run build
npm run preview
```

`dist/` contiene la build di produzione pronta da caricare. `npm run preview` la serve normalmente su `http://localhost:4173`. Non aprire `dist/index.html` via `file://`: i moduli JavaScript richiedono un server HTTP. Per servire soltanto la build senza Node è sufficiente un server statico, per esempio `python3 -m http.server 8080 --directory dist`.

## Pubblicazione su Netlify

Per una pubblicazione manuale carica **il contenuto di `dist/`**, oppure lo ZIP `bper-quest-web.zip`, su Netlify Drop. Non caricare i sorgenti come se fossero la build. Per un sito gestito collega il repository e usa `npm run build` come comando di build e `dist` come cartella di pubblicazione; `netlify.toml` contiene già queste impostazioni. [Documentazione ufficiale Netlify per Vite](https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/).

## Pubblicazione su Vercel

Importa il repository, seleziona il framework Vite e usa `npm run build` / `dist`. `vercel.json` contiene queste impostazioni. Se il repository contiene altre cartelle, imposta `bper-quest` come directory radice. [Documentazione ufficiale Vercel per Vite](https://vercel.com/docs/frameworks/frontend/vite).

Nessun backend, database, autenticazione, chiave API o variabile segreta è richiesto. I giocatori entrano direttamente nell’introduzione. Per mantenere un indirizzo pubblico e amministrare il sito è necessario gestire il progetto nel proprio servizio di hosting.

## Architettura

| File | Responsabilità |
| --- | --- |
| `src/main.tsx`, `src/style.css` | Menu, HUD, overlay, focus, comandi tattili, layout responsive |
| `src/game/model.ts` | Unico stato condiviso, raccolta, progressione, vite e fasi |
| `src/game/isometric.ts` | Proiezione 2:1 e conversione inversa |
| `src/game/levels.ts` | Tre mappe distinte, collisioni, punti validi, ricerca BFS |
| `src/game/movement.ts` | Movimento cardinale e risoluzione degli input |
| `src/game/enemies.ts` | Pattugliamento, esplorazione, inseguimento a turni, separazione |
| `src/game/collectibles.ts` | Selezione sicura e raggiungibile del tesoro attivo |
| `src/game/powerups.ts` | Durate, moltiplicatori, scadenza e reset dei bonus |
| `src/game/damage.ts` | Danno, scudo e invulnerabilità |
| `src/game/timer.ts` | Accumulo del tempo attivo a partire dal tempo trascorso |
| `src/game/scene.ts` | Orchestrazione Phaser, caricamento livello, depth sorting, feedback |
| `src/game/art.ts` | Texture originali disegnate a pixel su canvas e scalate senza smoothing |
| `src/game/audio.ts` | Musica ed effetti sintetizzati con Web Audio |
| `src/game/screenshot.ts` | Composizione locale del PNG e download |
| `src/game/browserQA.ts` | Verifica integrata disponibile esclusivamente in sviluppo |

Coordinate, collisioni e AI lavorano in celle logiche; il rendering converte separatamente in pixel. Gli oggetti vengono ordinati per la posizione del piede. Gli edifici hanno ingombri corrispondenti alla griglia. Una sola scena e una sola mappa sono attive; durante il cambio livello tutti gli oggetti precedenti vengono eliminati. La camera non scorre. La crescita dei mostri segue esattamente `1,1,2,3,4,5,6,7,8,9`, senza incremento di velocità.

## Test riproducibili

`npm test` esegue 21 test: proiezione, raggiungibilità, collisioni, mappe distinte, numero dei mostri, progressione completa, vite, scudo, timer, input, scadenza e sostituzione dei bonus, simulazione di nove nemici per un minuto su ciascuna mappa.

Per la verifica browser apri `http://localhost:5173/?qa=1&report=1` e premi **ESEGUI VERIFICA**. Il test esegue il ciclo reale di Phaser con passi di tempo controllati, muove il personaggio su percorsi cardinali, controlla le transizioni, i potenziamenti, la vittoria, il Game Over e il reset; genera e decodifica il PNG. La raccolta completa usa invulnerabilità di test per verificare in modo deterministico la progressione; il danno viene verificato separatamente. Senza `report=1` il rapporto si nasconde alla fine per consentire di ispezionare visivamente la vittoria.

Il test e l’accesso di debug sono esclusi dalla build di produzione. Vedi `QA.md` per gli esiti e i limiti delle prove eseguite.

## Grafica e audio

Grafica originale procedurale, senza emoji come personaggi e senza asset remoti: casette basse, tetti colorati, aiuole, casse, panchine, pozzo basso, lampioni, lapidi, zucche e un piccolo vampiro, quattro tipi di mostri e dieci tesori distinti. La densità dei pixel rimane coerente. Il PNG usa font di sistema; musica ed effetti sono sintetizzati localmente.

L’interfaccia offre testo ad alto contrasto, focus visibile, controlli da tastiera e bonus distinguibili per simbolo oltre che per colore. Le animazioni CSS decorative rispettano `prefers-reduced-motion`. Non è prevista una modalità di gioco non visiva.

Il testo della scadenza “prima del 31/10” viene mantenuto esattamente come richiesto e non applica automaticamente una limitazione al gioco.

## Revisione 1.1 — chiarezza e navigazione

Mappe ampliate a 20×20 celle, con casette basse collocate sul fondo e piccoli ostacoli. Le celle percorribili restano sempre visibili; non esiste alcuna dissolvenza degli edifici. Il nuovo test controlla l’intera area percorribile rispetto alle sagome delle case.

Il personaggio è un vampiro con mantello cremisi. Tesori: base dorata e scintille. Bonus: contenitore e simboli ciano. Mostri: sagome animate, dettagli viola/magenta e indicatore di pericolo sul pavimento. Le decorazioni non usano questi indicatori.

L’introduzione è una sola finestra con titolo, benvenuto, dinamiche, istruzioni e pulsante di avvio. Durante il gioco il HUD mostra soltanto vite, livello, oggetti, tempo, pausa e audio; i bonus attivi e le notifiche sono temporanei.

## Revisione 1.2 — atmosfera e ritmo

Palette del borgo aggiornata: viola notturni, pietra lavanda, tetti ruggine/prugna, vegetazione autunnale e luci arancio più calde. Le zucche decorative sono più visibili, senza indicatori interattivi.

Velocità base del vampiro: 3,8 celle/s (prima 2,55, circa +49%). Mostri: 1,75 celle/s (prima 1,06, circa +65%), costanti in tutti i livelli e più lenti del giocatore. I moltiplicatori dei bonus rimangono +30% e +40%; anche le animazioni di movimento sono più rapide.

## Revisione 1.3 — città, parco e torre

Tre ambientazioni distinte con terreno, sfondo e ostacoli propri:

1. **Piazza delle Zucche:** città con casette basse, acciottolato, lampioni e pozzo.
2. **Parco delle Lanterne:** prati, sentieri, alberi autunnali, panchine, rocce, tronchi e un laghetto non attraversabile.
3. **Torre della Mezzanotte:** grande torre stregata sul fondo, mura in rovina, pilastri, lapidi e pavimentazione del cortile. La zona percorribile rimane davanti alla torre, che non richiede trasparenze.

La camera rimane fissa e mostra sempre tutta la mappa. La raccolta resta 3/3/4, con vite e tempo preservati. Restano le velocità della revisione 1.2. Le anteprime dei livelli sono accessibili solo nel test di sviluppo `?qa=1`, non nel gioco pubblicato.

## Revisione 1.4 — menu e percorsi

Il pulsante con la casa torna al menu e azzera la partita. Le istruzioni spiegano durata e vantaggi di fulmine e scudo. Le pedane sono rimosse: resta il fulmine (+30% per 6 secondi). Nel terzo livello ci sono tre scudi e 4–7 mostri, due in meno rispetto alla progressione precedente. Uno scudo già attivo impedisce di consumarne un altro inutilmente. La scadenza della vittoria e del PNG è 31/10. La torre è sul bordo esterno: tutto il cortile è percorribile, con assistenza alle svolte senza movimento diagonale.

## Revisione 1.5 — fontana e bonus riconoscibili

La fontana del parco comprende una base in pietra di 5×5 celle, tutta solida per giocatore e mostri. Lo scudo è azzurro e mostra un anello protettivo; il fulmine è verde lime e mostra una scia durante il movimento. Icone, bagliori e indicatori HUD distinguono i due effetti anche quando sono attivi insieme. La spiegazione dello scudo è “Ti protegge dall’attacco di un mostro, poi scompare”.

## Revisione 1.6 — scudo a tempo

Lo scudo assorbe un solo attacco e dura al massimo 10 secondi di gioco attivo. Il HUD mostra il conto alla rovescia; la scadenza annuncia “SCUDO TERMINATO”. Pause, transizioni e schermate finali fermano il consumo del tempo. Colpo assorbito, nuovo livello, menu e riavvio azzerano l’effetto e il suo indicatore.

## Revisione 1.6.1 — fontana e ordine di rendering

La vasca e la base sono renderizzate al livello del terreno; il getto rialzato è uno sprite separato. La base rimane interamente solida: PG e mostri devono aggirarla, senza essere coperti dal disegno della vasca quando sono accanto ai bordi.

## Revisione 1.7 — richiami a Lucca

Piazza dell’Anfiteatro: facciate curve e continue in toni di intonaco e terracotta, pavimentazione ovale. Passeggiata sulle Mura: parapetti in mattoni e viale alberato, mantenendo il parco e la fontana. Torre Guinigi: muratura calda e giardino di alberi sulla sommità. Questi elementi sono interpretazioni stilizzate; le sagome di sfondo restano fuori dalle vie percorribili e non usano trasparenza.
