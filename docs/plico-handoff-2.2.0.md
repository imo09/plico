# plico - handoff 2.2.0

Data: 15/11/2026. Ramo: `ccr-5b86d3e4-nyuvv5` (pull request n. 1). Riferimento: `docs/plico-progetto-2.0.md`, revisione 3. L'handoff precedente, `plico-handoff-2.0.0.md`, resta valido per tutto ciò che qui non cambia (Dropbox, misure con PDF grandi, passi per la chiave).

## 1. Stato

1. **Pagina nera mentre si scrive**: corretta per le due cause probabili. La tela del tratto in corso non usa più l'opzione "a bassa latenza". Le tele dei segni esistono solo per le pagine in vista (al massimo 3, al massimo 8 milioni di pixel l'una) e si liberano appena escono dallo schermo. Su tablet e telefono anche pdf.js usa al massimo 8 milioni di pixel per pagina. Va confermato sul Galaxy Tab (sezione 5).
2. **Fase 3 costruita**: Testo, Forme, Seleziona (sposta, ridimensiona, colore, copia, elimina), immagini e firma, evidenziatore agganciato al testo, pannello Pagine (aggiungi, sposta, elimina), selezione multipla in libreria con explorer delle cartelle e trascinamento, doppio tocco per ingrandire, tocco con due dita per annullare, prova della penna.
3. **Marchio nuovo**: "il plico legato" (progetto, punto 101 e appendice A6). Icone, favicon, icona per Android e animazione di avvio rifatte.
4. **Versione**: 2.2.0.
5. **Prove**: 14 dei moduli puri, 22 dell'app nel browser, 7 di sincronizzazione. Tutte passano. Il PDF esportato con testo, immagine, firma, forme ed evidenziazione sul testo è stato aperto anche con Poppler, un lettore diverso da pdf.js: si vede tutto.

## 2. File nuovi o cambiati

| File | Cosa |
|---|---|
| `src/65-scrittura.js` | Riscritto: tele con limite, forme, doppio tocco, due dita, barra con i nuovi strumenti, registro `EXTRA` |
| `src/66-strumenti.js` | Nuovo: testo, Seleziona, evidenziatore agganciato al testo, immagini, firma |
| `src/67-pagine.js` | Nuovo: pannello Pagine |
| `src/72-penna.js` | Nuovo: prova della penna (`#penna`) |
| `src/50-libreria.js` | Selezione multipla, explorer delle cartelle, trascinamento |
| `src/40-pdf.js` | Disegno di testo, immagini ed evidenziazioni; immagini nel PDF (Stamp con bitmap); misura del testo |
| `src/36-segni.js` | `forma`, `trasforma`, `rettDiTutti`, `intersecano` |
| `src/41-vuoto.js` | Misura della pagina facoltativa, per la pagina bianca della stessa misura |
| `icone/` | Marchio nuovo |

## 3. Decisioni

6. **Prese da Simo**: tutte le soluzioni proposte (punti 20-25 della conversazione): correzione completa del nero, pressione lunga che seleziona, solo dimensione e colore per il testo; più la fase 3 e il marchio nuovo.
7. **Scelte mie** [proposto]:
   - **Cartelle selezionabili** insieme ai documenti (il punto 23 non aveva una scelta consigliata): si spostano dentro altre cartelle, con il controllo che una cartella non finisca dentro se stessa.
   - **Versione 2.2.0** invece di 2.1.0, perché contiene anche la fase 3.
   - **Ogni modifica con Seleziona crea segni nuovi** e chiude i vecchi, invece di cambiarli: annulla e unione fra dispositivi restano le stesse di sempre.
   - **Firma come tratti di penna raggruppati**, non come immagine: si sposta, si ridimensiona, cambia colore e resta nitida nel PDF.
   - **Immagini** nel PDF come annotazione Stamp con la bitmap, ridotte a 1600 px per lato, in JPEG oppure PNG se hanno trasparenza.
   - **Evidenziatore agganciato al testo** automatico: se il tratto parte da una parola segue il testo, altrimenti è a mano libera. Si spegne nelle opzioni.
   - **Sul telefono** Forme, Testo, Seleziona, Immagine e Firma stanno sotto un quarto pulsante "Altri strumenti", per non allungare la barra oltre lo schermo.
   - **Su schermi bassi** (meno di 900 px) la barra mostra un solo colore rapido e pulsanti da 44 px, così "Leggi" resta visibile.
   - **Chiusura del documento**: pdf.js si libera 0,80 secondi dopo, per non avere errori "Transport destroyed" mentre il visore finisce le letture in corso.
8. **Testi aggiunti**: "Altri strumenti", "Inserisci", "Immagine", "Firma", "Disegna la firma", "Usa questa firma", "Disegnane una nuova", "Firma inserita: trascinala dove serve", "Immagine inserita: trascinala o ridimensionala dagli angoli", "Firma salvata", "Firma cancellata", "Annullato", "Copiato", "Copiati {n} segni", "Segno eliminato", "Eliminati {n} segni", "Colore: {nome}", "Alcuni caratteri non si vedranno negli altri lettori PDF.", "Pagine", "Pagina aggiunta", "Pagina spostata", "Pagina {n} eliminata", "Un documento ha almeno una pagina.", "Aggiungi pagina bianca dopo", "Aggiungi pagina bianca alla fine", "Elimina la pagina", "{n} selezionati", "Seleziona tutti", "Spostati {n} elementi in {cartella}", "Una cartella non può andare dentro se stessa.", "Sposta qui", "Nuova cartella qui", "Nessuna sottocartella.", "Prova la penna" con le sue righe.

## 4. Prove nuove

9. `prove/app.cjs` aggiunge: evidenziatore a mano libera e sul testo; testo con accenti ed euro, forma, Seleziona e sposta, tocco con due dita che annulla; immagine e firma; PDF esportato con FreeText, Highlight e Stamp; selezione multipla con explorer e cartella nuova; pannello Pagine con elimina e Annulla; doppio tocco; al massimo 3 tele scorrendo 50 pagine, ciascuna sotto 8 milioni di pixel; prova della penna.
10. `prove/unita.test.mjs` aggiunge: forme, `trasforma`, riquadri.

## 5. Da verificare sul Galaxy Tab

11. **La pagina non diventa più nera** scrivendo con la S Pen, anche dopo aver scorso molte pagine e dopo aver ingrandito.
12. **Trascinamento con il dito** di documenti sulle cartelle del pannello (con il mouse funziona; con il dito dipende da Chrome per Android).
13. **Testo**: la tastiera non copre il campo; la maniglia si trascina bene con la penna e con il dito.
14. **Tocco con due dita per annullare**: non scatta per sbaglio mentre si ingrandisce.
15. **Prova della penna**: il tasto laterale risulta "Rilevato" e la sospensione "Sì" quando la penna è vicina.

## 6. Cosa deve fare Simo

16. **Provare**: dalla pull request n. 1, prima di unirla, oppure dopo. Per provarla prima, segui i passi già scritti (GitHub, Settings, Pages, ramo `ccr-5b86d3e4-nyuvv5`).
17. **Dirmi** se la pagina nera è sparita e cosa non va nei nuovi strumenti.
18. **Chiave Dropbox e istruzioni di folio**: come nell'handoff 2.0.0, sezione 6.
