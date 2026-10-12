# Verifica BPER QUEST

Verifica eseguita il 12 ottobre 2026.

- TypeScript strict e formattazione Prettier: superati.
- Build Vite di produzione: generata.
- Test automatici Node: 15/15 superati.
- Verifica integrata nel browser Chromium dell’app: percorso completo 0 → 3 → 6 → 10, con tre mappe distinte e camera fissa; nessun errore JavaScript rilevato.
- Collisioni contro edifici, risoluzione di due input contemporanei, separazione dei nemici e numero corretto dopo ogni raccolta: verificati.
- Fulmine +30% / 6 secondi, pedana +40% / 4 secondi, scudo, invulnerabilità, Game Over e riavvio completo: verificati.
- Timer fermo in pausa, transizioni e vittoria; vite e tempo preservati fra livelli: verificati.
- PNG composto e decodificato dal browser: formato image/png, dimensioni 1200×900. Ispezione visiva: titolo, completamento, 10/10, tempo, email e scadenza presenti.
- Layout responsive: verificato a 390×844 e a larghezza desktop. Nessun overflow orizzontale; l’intera mappa resta nel canvas e il risultato finale è leggibile.

## Limiti delle prove

La verifica completa di progressione usa un percorso deterministico e invulnerabilità di test; il comportamento del danno è verificato separatamente. I test non costituiscono una valutazione del bilanciamento con giocatori esterni.

Safari, Firefox e Microsoft Edge non sono stati eseguiti in questa sessione: il controllo delle applicazioni native richiedeva permessi del computer non disponibili. Il gioco utilizza API web standard supportate dai browser moderni, ma la verifica diretta di ogni motore e di dispositivi iOS/Android reali resta da eseguire.

Il download PNG usa un link locale con attributo download e Blob URL; il contenuto PNG è stato verificato. L’effettivo salvataggio può seguire le preferenze di download del browser dell’utente.

La pubblicazione tramite Sites non era disponibile nel workspace. Il pacchetto statico è indipendente da Sites e può essere caricato su Netlify, Vercel o qualsiasi server statico.

## Revisione 1.1

- Tre mappe nuove 20×20: piazza, vicoli con aiuole basse e giardino di Halloween.
- Test aggiuntivo: nessuna casa si trova davanti a una cella percorribile. Nessuna trasparenza dinamica degli edifici.
- Verifica browser ripetuta: 62 controlli superati, inclusi progressione completa, collisione contro un ostacolo, danno, bonus, PNG e reset. Nessun errore JavaScript.
- Interfaccia iniziale ridotta a una finestra; HUD ridotto ai dati di partita.
- Verifica mobile 390×844: nessun overflow orizzontale, mappa intera e comandi tattili visibili.

## Revisione 1.2

Palette viola/autunnale e luci arancio aggiornate. Vampiro a 3,8 celle/s, mostri a 1,75 celle/s; animazioni più rapide. La verifica alle nuove velocità supera 13 test automatici e tutti i 62 controlli del percorso browser, compresi collisioni, separazione dei mostri, durata dei bonus, progressione, Game Over, vittoria e PNG. Nessun errore JavaScript rilevato.

## Revisione 1.3

15 test automatici superati; aggiunti controlli sui terreni distinti, sulla collisione del laghetto e sulla visibilità delle celle percorribili rispetto ad alberi e torre. Ripetuta la verifica completa nel browser: 62 controlli superati, nessun errore JavaScript. Ispezionate le ambientazioni del parco e della torre, entrambe interamente nel viewport fisso.

## Revisione 1.4

19 test automatici superati; lint e build riusciti. Verificate tutte le 221, 207 e 217 celle percorribili delle tre mappe, con il corpo di collisione del giocatore e tutti i passaggi cardinali adiacenti. Assistenza alle svolte verificata senza diagonali né attraversamento degli ostacoli. Test browser completo superato: ritorno al menu, reset, raccolta 10 oggetti, transizioni, bonus, danno, Game Over, camera fissa, timer e PNG valido 1200×900. Pedane rimosse; tre scudi distinti nel terzo livello e progressione finale ridotta a 4, 5, 6, 7 nemici. Scadenza 31/10 condivisa dalla vittoria e dal PNG.

## Revisione 1.5

20 test automatici superati, lint e build riusciti. Fontana: tutta la base 5×5 è solida, con prove di avvicinamento da quattro lati per giocatore e mostri e percorso che aggira l’ostacolo. Tutte le celle e i passaggi giocabili delle tre mappe restano raggiungibili. Verifica browser completa superata, inclusi messaggi distinti di fulmine/scudo e PNG valido. Ispezionati la fontana e i bonus azzurro/verde nel parco e il testo aggiornato nel menu di produzione.

## Revisione 1.6

21 test automatici superati; lint e build riusciti. Verifica browser completa superata: conto alla rovescia dello scudo, durata massima di 10 secondi, congelamento in pausa, messaggio di scadenza, consumo al primo colpo con azzeramento del tempo, reset, transizioni e raccolta completa. PNG generato e decodificato correttamente.

## Revisione 1.6.1

21 test automatici, lint e build superati. Verifica browser completa superata, inclusa la profondità effettiva degli sprite Phaser di PG e mostri lungo tutti e quattro i lati della fontana. Base e ombre sono sotto i personaggi; il getto è un elemento distinto. Ispezione visiva con PG e tre mostri disposti lungo il bordo. Le collisioni della base 5×5 restano verificate da ogni lato.
