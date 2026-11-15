# plico - handoff 2.0.0

Data: 15/11/2026. Ramo: `ccr-5b86d3e4-nyuvv5`. Riferimento: `docs/plico-progetto-2.0.md`, revisione 2.

## 1. Stato

1. **Fatte**: fase 0 (pulizia), fase 1 (plico 2.0, lettore e scrittura in locale) e fase 2 (sincronizzazione Dropbox) insieme, come chiesto da Simo. La sincronizzazione è pronta ma spenta: si accende con la chiave dell'app Dropbox (sezione 6).
2. **Sostituisce la prova tecnica**: il vecchio `index.html`, `lib/embedpdf/`, `lib/o2p/`, `fonts/` ed `esempi/contratto-lungo.pdf` sono tolti da questo ramo. Su `main` restano finché il ramo non viene unito.
3. **Prove**: 11 prove dei moduli puri, 15 prove dell'app nel browser, 7 prove di sincronizzazione con un Dropbox finto e due dispositivi. Tutte passano (sezione 4).
4. **Non ancora provato su dispositivi veri**: tutto ciò che è segnato [da verificare] nel progetto (sezione 7).

## 2. File per ripartire

| File | Cosa |
|---|---|
| `src/` | Sorgenti numerati (punto 121). `index.html` e `sw.js` si generano con `node build.mjs`: non si modificano a mano |
| `src/versione.json` | Versione e chiave Dropbox |
| `build.mjs` | Costruzione (appendice A5, con la chiave Dropbox in più) |
| `prove/unita.test.mjs` | Moduli puri: `node --test prove/unita.test.mjs` |
| `prove/app.cjs` | App nel browser: `node build.mjs && node prove/app.cjs` (con `--schermate` salva le schermate in `prove/schermate/`) |
| `prove/sync.cjs` | Sincronizzazione con un Dropbox finto: `node prove/sync.cjs` (costruisce con una chiave di prova e poi ricostruisce come prima) |
| `prove/grandi.cjs` | Misura con un PDF grande: `node build.mjs && node prove/grandi.cjs 200` |
| `docs/memoria-office-pdf.md` | Come riprendere il convertitore Office |

## 3. Modifiche e decisioni

5. **Seguite dal progetto**: struttura, moduli, testi, colori, misure, formato del file PDF, copia di sicurezza, service worker, manifest, regola di sicurezza, sincronizzazione (sezione L della revisione 2).
6. **Appendici cambiate** (regola 167), con il perché:
   - A2 `componi`: accetta l'originale anche come Blob e l'impronta già nota, così non tiene due copie del file in memoria (punto 153e). Il formato del file è identico.
   - A2: aggiunte `scomponiBlob`, `carica`, `apriDocumento` (apertura a pezzi), `disegnaSegni`, `miniatura`, `fileDi`.
   - A1: aggiunte `rettDi`, `tocca`, `toccaTratto`, `linea`, `arrotonda`, `pulito`.
   - A5: legge la chiave Dropbox da `src/versione.json` o da `PLICO_DROPBOX` e apre la regola di sicurezza a Dropbox solo con la chiave.
   - `src/35-freehand.js`: l'ultima riga `export const getStroke = R;` va a capo, perché la costruzione riconosce `export` solo a inizio riga.
7. **Scelte mie** [proposto]:
   - **File da Condividi > plico**: il service worker li tiene nella memoria `plico-arrivi` invece che nell'archivio `arrivi` di IndexedDB. Così il service worker non deve conoscere lo schema della base dati. L'app li importa all'avvio.
   - **Colori delle cartelle**: Ruggine `#B4544A` (tinta `#F3DCD8`), Blu `#2E5E9E` (tinta `#DCE5F1`), Sabbia `#A89272` (tinta `#EEE7DA`). Ottone, Verderame e Acciaio come nel mock-up.
   - **Archivio `remoti`** già nella versione 1 della base dati: così attivare Dropbox non richiede un aggiornamento dello schema.
   - **Tele dentro `canvasWrapper`** di pdf.js: restano attaccate alla pagina mentre si ingrandisce e vengono liberate quando pdf.js libera la pagina (punto 135b).
   - **Tela viva**: l'evidenziatore in corso si vede al 60% di opacità; a tratto finito diventa pieno con fusione "moltiplica".
   - **haPenna**: diventa vero anche quando la penna scrive in Scrittura, non solo come segnale in Lettura.
   - **Tasto Scrivi**: compare solo a documento pronto, così un tocco durante il caricamento non viene perso.
   - **Testi aggiunti** (punto 33): "Importo {n} documenti", "Preparo il PDF", "PDF pronto [Condividi]", "Aggiunto ai preferiti", "Tolto dai preferiti", "Spostato in {cartella}", "Duplicato: {nome}", "Ripristinato: {nome}", "Cestino svuotato", "Pagina aggiunta", "Segni della pagina cancellati [Annulla]", "Questa pagina non ha segni.", "Lascia qui i PDF", "Il documento è cambiato su un altro dispositivo: chiudilo e riaprilo per vederlo aggiornato.", "Dropbox collegato", "Dropbox scollegato", la riga di Collega Dropbox e i messaggi di errore della sezione L.
   - **Guida, Attenzione**: aggiunte due frasi sui limiti (Archivio del telefono e stampa; PDF fino a 200 MB), come chiede il punto 16.
8. **Punti aperti risolti con la scelta consigliata**: 188 (a), 189 (a), 190 (a), 191 (a) con i file dei segni, 192 (a), 193 (a) su questo ramo, 194 (a).
9. **Non fatto, di proposito**: l'etichetta git `v1.0-prova-tecnica` (passo 1 della fase 0): la mette Simo, o io con il suo permesso.

## 4. Misure

Misurate il 15/11/2026 in Chromium su questo computer di lavoro (un PC, non il tablet né un telefono), con `prove/grandi.cjs`: PDF di pagine con immagini non compresse, come una scansione.

| Misura | Obiettivo (tabella I6) | PDF di 49,81 MB, 50 pagine | PDF di 198,24 MB, 199 pagine |
|---|---|---|---|
| Importazione | - | 0,88 s | 1,09 s |
| Prima pagina visibile | meno di 3,00 s sul tablet (200 MB) | 0,33 s | 0,94 s |
| PDF con 50 tratti (Salva una copia) | meno di 15,00 s sul tablet (200 MB) | 0,56 s | 1,52 s |
| Peso aggiunto da 50 tratti | - | 0,02 MB | 0,02 MB |

- `index.html`: 297 KB, font compresi (obiettivo: meno di 0,40 MB).
- Repository senza `.git`: 5,80 MB circa, più 2,50 MB di schermate di prova in `prove/schermate/` (obiettivo fase 0: meno di 6,00 MB senza le schermate).
- Un PDF di 200,23 MB viene rifiutato con il messaggio del punto 153b, come previsto.
- Il primo tentativo di misura ha trovato un difetto: per ogni PDF grande senza segni l'importazione rileggeva tutto il file cercando il blocco plico. Corretto: si cerca solo negli ultimi 16 MB (punto 153f).
- Memoria: non misurata. I buffer dei PDF stanno fuori dalla memoria JavaScript che Chromium riporta, quindi il numero non sarebbe vero. Va guardata sul telefono (sezione 7).
- Tablet e telefono: da misurare sui dispositivi veri.

## 5. Punti aperti

10. **Istruzioni di folio** (punto aperto 187): quando arrivano, si confrontano con la sezione L e si allinea plico dove serve.
11. **Etichetta `v1.0-prova-tecnica`**: (a) la metto io su `main` e la invio; (b) la mette Simo.

## 6. Cosa deve fare Simo

12. **Accendere Dropbox**:
    1. Apri https://www.dropbox.com/developers/apps ed entra con il tuo account.
    2. Tocca "Create app". Scegli "Scoped access", poi "App folder". Nome: "plico" (se è preso, "plico-nautargo").
    3. Nella scheda "Permissions" spunta `files.metadata.read`, `files.metadata.write`, `files.content.read`, `files.content.write` e premi "Submit".
    4. Nella scheda "Settings", in "OAuth 2 - Redirect URIs", aggiungi `https://plico.nautargo.com/`. In "Allow public clients (Implicit Grant & PKCE)" scegli "Allow".
    5. Copia la "App key" (non serve la "App secret") e mandamela con le istruzioni di folio. La metto io in `src/versione.json`, costruisco e provo.
13. **Provare sul Galaxy Tab** dopo l'unione del ramo, con plico installata: scrittura con la S Pen, tasto laterale per cancellare, palmo appoggiato mentre scrivi, due dita per ingrandire in Lettura e in Scrittura, un PDF grande (sezione 4).
14. **Mettere online**: unire questo ramo in `main` (lo posso fare io con una pull request, se me lo chiedi).

## 7. Da verificare su dispositivi veri

15. Tela viva con `desynchronized` (punto 138): se sfarfalla, si toglie l'opzione.
16. Due dita in Lettura sul Galaxy Tab (punto 143).
17. Palmo (punto 64) e tasto della S Pen (punto 65) con la penna vera.
18. PDF di 200 MB su telefono: apertura e Condividi (punto 153e).
19. iPhone installato: ritorno da Dropbox (punto 163l).
