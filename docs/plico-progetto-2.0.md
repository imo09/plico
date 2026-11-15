# plico 2.0 - progetto esecutivo

Revisione 2 del 15/11/2026. Sostituisce la revisione del 14/11/2026 e la prima stesura "Progetto plico 2". Le novità sono riassunte nella sezione B2. Ha due lettori: Simo, per decidere (sezioni A-F, N e Punti aperti), e chi costruisce l'app, anche un modello IA meno capace di chi ha scritto il progetto (tutto il documento, appendici comprese).

Etichette: **[deciso]** scelto da Simo, o scelto qui su sua delega. **[fatto]** verificato con una prova il 14/11/2026. **[proposto]** scelta di progetto in attesa di conferma: si costruisce così, salvo indicazione contraria. **[aperto]** non deciso: non si costruisce finché non c'è risposta. **[da verificare]** va provato su un dispositivo vero.

I numeri fra parentesi dopo "regola" rimandano ai punti di `nautargo-identita.md`.

---

## A. In breve

1. **Cos'è**: plico è il lettore di PDF della famiglia nautargo su cui si scrive a mano. Apri un documento e lo leggi; se vuoi ci scrivi sopra con la penna, con il dito o con il mouse; i segni restano nel PDF.
2. **Dove gira**: telefono, tablet e PC, dalla stessa web app installabile su plico.nautargo.com. Con una S Pen dà il meglio: la penna scrive, il dito scorre.
3. **Confine** (regola 8): teca legge i formati leggeri, folio scrive in Markdown, plico tratta i PDF. plico non modifica il testo dei PDF e non converte altri formati.
4. **Promessa**: leggere è immediato; scrivere è semplice, chiaro e veloce come nel mock-up; nessun tasto Salva; nessun account; i file restano tuoi e funzionano anche fuori da plico.
5. **Versioni**: 2.0 lettore e scrittura in locale. 2.1 sincronizzazione Dropbox. 2.2 strumenti avanzati. 2.3 extra. Su richiesta di Simo (15/11/2026) la 2.0 e la parte Dropbox si costruiscono insieme: la sincronizzazione è pronta nel codice e si accende quando nella costruzione c'è la chiave dell'app (sezione L).
5b. **Peso dei documenti**: plico regge PDF fino a 200 MB ciascuno (sezione I7). Oltre, l'importazione si ferma con un messaggio chiaro.
6. **Peso**: il repository passa da 34,40 MB a circa 5,00 MB. Al primo avvio si scaricano circa 2,40 MB (0,70 MB circa compressi in rete), poi plico parte dalla memoria del dispositivo, anche senza rete.

## B. Cosa cambia rispetto alla prima stesura

| Tema | Prima stesura | Ora | Perché |
|---|---|---|---|
| Scrivere i segni nel PDF | Uno scrittore PDF fatto apposta, 500-700 righe | Lo fa pdf.js; plico aggiunge solo un piccolo blocco di dati | Provato in 8 casi con 0 errori: meno codice, meno rischio |
| Archivio sul dispositivo | Due sistemi (OPFS e IndexedDB) | Solo IndexedDB | Un sistema solo, come le altre app nautargo |
| Quando si scrive il PDF | A ogni chiusura del documento | Solo quando serve: Condividi, Salva una copia, sincronizzazione | Durante la scrittura si salvano solo i segni: istantaneo |
| Dispositivi | Tablet in orizzontale | Telefono, tablet e PC | Richiesta; regola 63 |
| Stati | Sempre editor | Lettura e Scrittura | plico è anche un semplice lettore |
| Strumenti in 2.0 | 7 | 3: penna, evidenziatore, gomma | Regola 9; mai funzioni a metà |
| Tipi di penna | Penna, pennarello, matita | Una penna | Regola 9 |
| Modalità di input | 3 a scelta | 1 comportamento più un interruttore | Regola 9 |
| Cartelle su Dropbox | Specchio delle cartelle | Una cartella con nomi leggibili più un indice | Meno casi limite |
| Codice | Molti file caricati dal browser | Un solo index.html costruito da sorgenti numerati | Regola 77 |
| Font | Google Fonts | Dentro l'app | Regole 51 e 78 |
| Nome e marchio | "plico." con il punto | "plico" senza punto, marchio provvisorio | Regole 55 e 56 |
| Parola per le note a mano | Note | Segni | Regola 21 |

### B2. Novità della revisione 2 (15/11/2026)

| Tema | Revisione 1 | Revisione 2 | Perché |
|---|---|---|---|
| PDF grandi | Nessun limite dichiarato | Fino a 200 MB per documento; regole di memoria nella sezione I7 | Decisione di Simo (punto aperto 25) |
| Apertura dei PDF | Tutto il file in memoria (`data: bytes`) | A pezzi dal Blob dell'archivio (`PDFDataRangeTransport`) | Decisione 24a: meno memoria, prima pagina prima |
| Tele dei segni | Ricreate a ogni disegno della pagina | Anche liberate (`width = 0`) quando pdf.js libera la pagina | Senza questa regola 200 pagine riempiono la memoria |
| `componi` | Riceve l'originale come Uint8Array e ricalcola l'impronta | Riceve anche un Blob e l'impronta già nota | Una copia in meno dell'originale in memoria |
| Copia di sicurezza | Un solo .zip | Parti da 1,00 GB al massimo | Formato zip classico (4 GB) e memoria del telefono |
| Dropbox | Un PDF per documento, ricaricato a ogni modifica | Un PDF per documento più un piccolo file di segni (`/Segni/{id}.json`); il PDF si ricarica solo alla chiusura del documento | Decisione 23a: con un PDF da 200 MB non si ricarica tutto per una firma |
| Dropbox, caricamento | Una chiamata per file | Sopra 8 MB, sessione a pezzi da 8 MB | Limite di 150 MB per chiamata e reti mobili instabili |
| Dropbox, moduli | `80-sync.js` | `37-unione.js` (puro), `78-dropbox.js` (client), `80-sync.js` (giro) | Regola 83: la logica di unione si prova da sola |
| Eliminare per sempre | Cancella la scheda | Lascia una lapide (`rimosso`) per 90 giorni | Senza lapide un altro dispositivo farebbe ricomparire il documento |
| Solo con Wi-Fi | Sempre presente | Solo dove il browser dice il tipo di rete | Regola 37: nessuna voce che non funziona |
| Costruzione | Una fase alla volta | Fasi 0, 1 e 2 insieme, la 2 senza chiave | Richiesta di Simo |

7. **La correzione più importante**: nella prima stesura avevo scritto che il salvataggio di pdf.js perde la pressione della penna e che serviva uno scrittore PDF dedicato. Era vero solo per uno dei suoi percorsi. Rileggendo il codice e provando, pdf.js sa scrivere contorni pieni a spessore variabile: lo scrittore dedicato non serve più.

## C. Decisioni

| N. | Tema | Scelta | Stato |
|---|---|---|---|
| C1 | Motore PDF | pdf.js 6.4.299 (build legacy), unico motore per leggere e per scrivere | [deciso] su delega (punto 15) |
| C2 | Segni nel PDF | Annotazioni standard scritte da pdf.js più un blocco di commento con i dati per rimodificarli | [fatto] |
| C3 | Office in PDF | Fuori dall'app, con memoria (sezione O) | [deciso] 16a |
| C4 | Cloud | Dropbox, solo cartella dell'app | [deciso] 17a |
| C5 | Archivio locale | Dentro l'app, in IndexedDB | [deciso] 18a |
| C6 | Penna e dita | La penna scrive, il dito scorre; plico è anche un semplice lettore | [deciso] 19a |
| C7 | Dispositivi | Telefono, tablet, PC | [deciso] |
| C8 | Identità | nautargo, con le eccezioni dichiarate nella sezione D | [deciso] |
| C9 | Tratto | perfect-freehand con i parametri del punto 106: è il tratto del nuovo mock-up | [proposto] |
| C10 | Parola "segni" | Vedi punto 31 | [proposto] |
| C11 | Marchio | Provvisorio: un foglio con un segno ottone (appendice A6) | [proposto] |
| C12 | Numero di versione | 2.0.0 | [proposto] |
| C13 | Dropbox | Una cartella con nomi leggibili, indice e un file di segni per documento | [deciso] 23a |
| C14 | Peso massimo | 200 MB per documento | [deciso] |
| C15 | Apertura | A pezzi dal Blob dell'archivio | [deciso] 24a |

## D. Identità nautargo applicata a plico

8. **Calma** (regola 7): pochi elementi, colori tenui, nessun contatore che chiede attenzione, movimento minimo.
9. **Un solo colore che si tocca** (regola 42): l'Ottone segna azioni e selezione: il pulsante Scrivi, lo strumento attivo, il +. Verderame e Ruggine solo per esito positivo e negativo. I colori di penne, evidenziatori e cartelle sono contenuto, non interfaccia.
10. **Sottrarre** (regola 9): tolti tipi di penna, modalità di input a scelta, tag, collaborazione, stili di pagina, stampa, ordinamento per dimensione, riconoscimento automatico di rettangoli e cerchi.
11. **Cosa non c'è, di proposito** (regola 10): nessuna modifica del testo o delle immagini del PDF; nessuna conversione da Word, Excel, PowerPoint; nessun riconoscimento della scrittura; nessun account e nessun server nautargo; nessuna collaborazione in tempo reale; nessuna IA; nessuna notifica. Va scritto nella Guida.
12. **I dati sono di chi usa l'app** (regola 11): tutto resta sul dispositivo; la copia di sicurezza è un file .zip che l'app ricorda di esportare; con Dropbox i file stanno nell'account dell'utente.
13. **Mai inventare** (regola 12): dove un dato manca compare un trattino; lo stato di salvataggio e di sincronizzazione dice il vero, mai "Sincronizzato" se non lo è.
14. **Tutto reversibile** (regola 14): Annulla sulle eliminazioni, Cestino a 30 giorni, Annulla e Ripeti sui segni, importazione di una copia con scelta fra Unisci e Sostituisci; con Sostituisci i documenti attuali vanno nel Cestino.
15. **Mai perdite silenziose** (regola 15): se un salvataggio fallisce l'app lo dice e offre una scelta (punto 84).
16. **Limiti detti chiari** (regola 16), con il rimedio accanto, nella Guida e nei messaggi:
    - i documenti non si vedono in Archivio del telefono: usa Condividi o Salva una copia;
    - cancellare i dati del sito o disinstallare l'app cancella i documenti: esporta una copia di sicurezza;
    - su iPhone il sistema può svuotare l'archivio dopo un lungo periodo senza uso (regola 82);
    - ad app chiusa non si sincronizza nulla;
    - per stampare: Condividi e scegli la stampa, oppure Salva una copia.
17. **Italiano** (regola 19): interfaccia in italiano, parole comuni, nessun termine inglese tranne "PDF" e i nomi propri (Dropbox, S Pen).
18. **Spiegare senza appesantire** (regola 20): una Guida a cinque paragrafi fissi (appendice A7) e poche icone "i" con una frase.
19. **La risposta prima del dato** (regola 23): in cima alla libreria c'è Riprendi, cioè l'ultimo documento aperto con la pagina dov'eri.
20. **Formati aperti** (regola 28): PDF standard per i documenti, .zip e JSON per la copia di sicurezza. Un PDF esportato da plico si apre con qualsiasi lettore.
21. **Copia di sicurezza** (regola 30): Esporta tutto; Importa con Unisci o Sostituisci, senza doppioni; promemoria se l'ultima copia ha più di 30 giorni e Dropbox non è collegato.
22. **Sincronizzazione per ultima e facoltativa** (regola 31): prima la 2.0 funziona tutta in locale, poi arriva Dropbox.
23. **File unico** (regola 77): l'app consegnata è un solo index.html più service worker, manifest e icone. **Eccezione dichiarata**: pdf.js resta in `lib/pdfjs/` come file separati, perché è di terze parti, pesa 2,13 MB e il suo worker deve essere un file a sé.
24. **Niente dall'esterno** (regola 78): nessuna richiesta verso altri siti; in 2.1 solo gli indirizzi di Dropbox.
25. **Installabile, con avviso di aggiornamento** (regola 79): "Nuova versione pronta - Aggiorna".
26. **Sottodominio** (regola 80): plico.nautargo.com su GitHub Pages, già attivo.
27. **Motore puro e prove** (regole 83 e 85): la logica dei segni e del formato sta in moduli senza interfaccia, provati da soli; poi prove in Chromium a misura di telefono, in chiaro e scuro; poi dispositivi veri.
28. **Prima il telefono** (regola 63): ogni schermata si disegna e si prova prima a 360 x 640 e 390 x 844, poi si allarga. **Eccezione dichiarata**: la scrittura a mano si collauda prima sul tablet con S Pen, che è l'uso principale.
29. **Monetizzazione** (regole 37-39): [aperto], rimandata. plico 2.0 è tutta gratuita. Candidata naturale a funzione premium, in futuro: la sincronizzazione.

## E. Lessico e testi

30. **Poche parole proprie** (regola 21): plico si spiega con cinque parole.

| Parola | Significato | Dove compare |
|---|---|---|
| Documento | Un PDF in libreria | Ovunque |
| Cartella | Contenitore di documenti e di altre cartelle | Libreria |
| Segni | Tutto ciò che aggiungi sopra un documento: scrittura a mano, evidenziazioni e, dalla 2.2, forme, testo, firma | Menu, Dettagli, Guida |
| Lettura | Stato in cui scorri, cerchi e selezioni il testo | Pulsante Leggi |
| Scrittura | Stato in cui penna, dito o mouse lasciano segni | Pulsante Scrivi |

31. **Perché "segni"** [proposto]: è una parola breve, comune, che non si confonde con le note di testo né con Samsung Notes.
32. **Regole di scrittura**: frasi brevi; verbi all'infinito o all'imperativo sui pulsanti ("Importa", "Scrivi"); mai lineetta lunga né punto mediano, si usa " - "; numeri con la virgola decimale; date come "Oggi 09:41", "Ieri", "12 nov", "12 nov 2025" se l'anno è diverso.
33. **Testi principali**: chi costruisce l'app usa questi testi così come sono; se ne serve uno che manca, lo scrive nello stesso stile e lo elenca nell'handoff.

| Dove | Testo |
|---|---|
| Viste | Tutti i documenti - Preferiti - Cartelle - Cestino |
| Barra in basso (telefono) | Documenti - Cartelle - Preferiti |
| Menu del + | Importa PDF / Dal dispositivo o da un'altra app - Nuovo documento vuoto / Pagine bianche, a righe o a quadretti - Nuova cartella / Scegli nome e colore |
| Riprendi | Riprendi - {nome} - pagina {n} di {totale} |
| Ordinamento | Recenti - Per nome |
| Ricerca | Cerca un documento |
| Riga del documento | {data} - {n} pag. |
| Libreria vuota | Qui arriveranno i tuoi PDF - Importa un PDF - Crea un documento vuoto - Apri il documento di prova |
| Cartella vuota | Questa cartella è vuota. Sposta qui un documento o importane uno. |
| Preferiti vuoti | Nessun preferito. Tocca la stella nel menu di un documento. |
| Cestino | I documenti restano qui 30 giorni, poi vengono eliminati. - Il cestino è vuoto. |
| Menu del documento in libreria | Apri - Rinomina - Sposta in una cartella - Aggiungi ai preferiti / Togli dai preferiti - Duplica - Condividi - Salva una copia - Sposta nel cestino |
| Nel cestino | Ripristina - Elimina per sempre |
| Avvisi | Spostato nel cestino [Annulla] - Importato: {nome} - {n} documenti importati - Copia salvata |
| File non PDF | plico apre solo PDF. Per Word, Excel e PowerPoint esporta in PDF dall'app che li ha creati, poi condividilo con plico. |
| File illeggibile | Questo file non è un PDF leggibile. Non è stato importato. |
| Conferma | Eliminare per sempre "{nome}"? Non si può annullare. [Elimina] [Annulla] |
| Stati | Scrivi - Leggi |
| Strumenti | Penna - Evidenziatore - Gomma - Scrivi con il dito - Annulla - Ripeti |
| Opzioni | Spessore - Colore - Raddrizza tenendo premuto - Linea dritta automatica - Cancella i segni di questa pagina |
| Salvataggio | Salvato - Salvataggio in corso |
| Pagina | {n} / {totale} - Vai alla pagina |
| Ricerca nel testo | Cerca nel testo - {i} di {n} - Nessun risultato |
| Menu del documento aperto | Cerca nel testo - Vai alla pagina - Aggiungi pagina - Rinomina - Sposta in una cartella - Aggiungi ai preferiti - Condividi - Salva una copia - Dettagli - Sposta nel cestino |
| Password | Questo PDF è protetto - Password - [Apri] - Password non corretta. Riprova. |
| Aggiornamento | Nuova versione pronta [Aggiorna] |
| Copia di sicurezza | Esporta tutto - Importa una copia - Ultima copia: {data} - Nessuna copia finora - L'ultima copia di sicurezza ha più di 30 giorni. [Esporta] |
| Importa una copia | Unisci: aggiunge ciò che manca e tiene la versione più recente. - Sostituisci: i documenti di adesso vanno nel Cestino. |
| Errore di salvataggio | plico non riesce a salvare su questo dispositivo. I segni restano finché tieni aperta questa pagina. [Salva una copia] [Riprova] |

## F. Schermate e comportamento

Riferimento visivo: canvas "Mock-up plico 2" (https://claude.ai/artifact/U3dN6PeRfg3eKihZNVv8gU). Le misure e i colori nel codice delle tavole valgono come riferimento; se una tavola e questo documento non concordano, vale questo documento.

### F1. Due disposizioni, tre modi di toccare

34. **Stretta**: finestra più stretta di 720 px. Telefoni. Barra in basso, fogli dal basso.
35. **Larga**: da 720 px in su. Tablet in verticale e in orizzontale, PC. Pannello a sinistra, barra strumenti di lato, menu a comparsa.
36. **Un solo confine**: 720 px, con `@media (min-width: 720px)` e `matchMedia`. Il PC non è una terza disposizione: è la disposizione larga con mouse e tastiera (punti 62 e 63).
37. **Misure di prova**: 360 x 640, 390 x 844, 800 x 1280, 1333 x 800, 1440 x 900, ciascuna in chiaro e in scuro.

### F2. Libreria

38. **Viste**: Tutti i documenti, Preferiti, una Cartella, Cestino. La vista iniziale è Tutti i documenti.
39. **Disposizione larga**: pannello fisso a sinistra largo 264 px con marchio e nome, ingranaggio delle Impostazioni, Tutti i documenti, Preferiti, albero delle Cartelle con colore e numero, Nuova cartella, Cestino. A destra: titolo, campo di ricerca, Importa, griglia o elenco, poi i documenti in griglia (`repeat(auto-fill, minmax(168px, 1fr))`). In basso a destra il + color ottone.
40. **Disposizione stretta** (regole 64 e 65): barra in alto fissa con marchio e "plico" a sinistra, lente e ingranaggio a destra. Barra in basso con Documenti, Cartelle, Preferiti e il + color ottone. Documenti in elenco: miniatura 48 x 64, nome, riga con data e pagine, pulsante con tre puntini. Il Cestino è l'ultima riga della scheda Cartelle.
41. **Riprendi** (regola 23): prima riga di Tutti i documenti, solo se esiste un ultimo documento aperto. Un tocco lo riapre alla pagina salvata.
42. **Scheda del documento**: miniatura della prima pagina con i suoi segni, nome su due righe al massimo, riga "{data} - {n} pag.", piccola penna se il documento ha segni, stella se è preferito.
43. **Cartelle**: nome, uno fra 6 colori (Ottone, Verderame, Ruggine, Acciaio, Blu, Sabbia), cartelle dentro cartelle senza limite; a schermo il rientro si ferma al quarto livello. Aprendo una cartella si vedono prima le sue sottocartelle come riquadri colorati, poi i suoi documenti.
44. **Il +** (fogli dal basso sulla disposizione stretta, menu sulla larga): Importa PDF, Nuovo documento vuoto, Nuova cartella.
45. **Importare**: selettore di file con scelta multipla; trascinamento di PDF sulla finestra (PC); "Condividi > plico" da un'altra app (solo con plico installata); "Apri con" su PC. Ogni file viene controllato aprendolo; se è un PDF esportato da plico i suoi segni tornano modificabili (punto 112).
46. **Nuovo documento vuoto**: scelta fra Bianco, A righe, A quadretti; nome proposto "Appunti del {data}"; nasce con 1 pagina A4 e si apre subito in Scrittura.
47. **Azioni su un documento** (ordine fisso, regola 68): pressione lunga, tasto destro o tre puntini aprono il menu della tabella al punto 33. In 2.0 si agisce su un documento alla volta.
48. **Eliminare**: sposta nel Cestino e mostra "Spostato nel cestino [Annulla]" per 6 secondi. Nel Cestino: Ripristina oppure Elimina per sempre, con conferma dentro l'app. All'avvio plico elimina ciò che è nel Cestino da più di 30 giorni.
49. **Eliminare una cartella**: i suoi documenti, anche nelle sottocartelle, vanno nel Cestino; Annulla riporta tutto. Un documento ripristinato quando la sua cartella non c'è più torna in Tutti i documenti.
50. **Cerca**: filtra per nome in tutta la libreria, senza distinguere maiuscole e accenti; ogni risultato mostra la cartella.
51. **Ordinamento e vista**: Recenti (ultima apertura o modifica) oppure Per nome; griglia oppure elenco. All'inizio: elenco sulla disposizione stretta, griglia sulla larga. La scelta vale per tutta la libreria e si ricorda.
52. **Stati vuoti** (regola 67): mai un riquadro vuoto; i testi sono nella tabella al punto 33. La libreria vuota offre il documento di prova `esempi/prova.pdf`.
53. **Promemoria della copia**: riga discreta sopra i documenti quando l'ultima copia ha più di 30 giorni, ci sono documenti e Dropbox non è collegato.

### F3. Documento: Lettura e Scrittura

54. **Due stati, un solo documento**: in Lettura si legge; in Scrittura si lasciano segni. Si passa dall'uno all'altro con un tocco: Scrivi e Leggi.
55. **Lettura**: pagine in colonna a scorrimento continuo; scorrimento del sistema, con inerzia; due dita per ingrandire; testo selezionabile e copiabile; collegamenti attivi; ricerca nel testo; indicatore di pagina; la posizione si ricorda alla riapertura.
56. **Scrittura**: compare la barra degli strumenti; penna, dito o mouse lasciano segni secondo la tabella al punto 61; il testo non si seleziona.
57. **Quale stato all'apertura**:
    - senza penna (telefono, PC): sempre Lettura;
    - con penna: Scrittura, a meno che l'ultima volta tu abbia scelto Leggi;
    - se plico non ha mai visto una penna e la penna si avvicina alla pagina o la tocca, passa da sola a Scrittura: con la S Pen, che si fa sentire prima di toccare, il tratto parte subito.
58. **Regola per chi costruisce** (variabili `haPenna` e `letturaScelta`, salvate nelle impostazioni):
    - apertura: `stato = (haPenna && !letturaScelta) ? 'scrittura' : 'lettura'`;
    - segnale di penna in Lettura (anche in sospensione, cioè vicina senza toccare) con `letturaScelta === false`: `haPenna = true`, `stato = 'scrittura'`; il tratto parte al contatto;
    - tocco su Leggi: `stato = 'lettura'`; se `haPenna`, allora `letturaScelta = true`;
    - tocco su Scrivi: `stato = 'scrittura'`, `letturaScelta = false`.
59. **Barra in alto**: Indietro; nome del documento (un tocco per rinominare) e sotto lo stato di salvataggio; indicatore "{n} / {totale}" (un tocco apre Vai alla pagina); sulla disposizione larga anche Cerca e Condividi; tre puntini.
60. **Scrivi e Leggi**: in Lettura c'è un solo pulsante tondo color ottone con la penna (in basso a destra sulla disposizione stretta, in alto a destra sotto la barra sulla larga). In Scrittura quel pulsante diventa la barra degli strumenti, che finisce con Leggi.

### F4. Come si tocca

61. **Chi fa cosa**:

| Stato | Penna | Un dito | Due dita | Mouse |
|---|---|---|---|---|
| Lettura | Scorre come un dito | Scorre; tocco sui collegamenti; pressione lunga seleziona il testo | Ingrandiscono | La rotella scorre; trascinando si seleziona il testo |
| Scrittura, dispositivo con penna | Scrive; con il tasto laterale premuto cancella | Scorre, con inerzia | Ingrandiscono e spostano | Scrive |
| Scrittura, senza penna oppure con "Scrivi con il dito" acceso | Scrive | Scrive | Ingrandiscono e spostano | Scrive; la rotella scorre |

62. **Mouse e tastiera** (PC): rotella per scorrere; Ctrl + rotella oppure Ctrl + e Ctrl - per ingrandire; in Scrittura il tasto sinistro scrive e il tasto centrale trascina la pagina.
63. **Tasti**: P Penna, E Evidenziatore, G Gomma, Esc Leggi oppure chiude il pannello aperto, Ctrl+Z Annulla, Ctrl+Maiusc+Z Ripeti, Ctrl+F Cerca nel testo, frecce, Pag su, Pag giù e Spazio per scorrere. I tasti a lettera valgono solo in Scrittura e solo se non si sta scrivendo in un campo.
64. **Palmo**: mentre la penna tocca o è vicina allo schermo, e per 0,70 secondi dopo l'ultimo suo segnale, i tocchi delle dita vengono ignorati.
65. **Tasto della S Pen**: finché è premuto la penna cancella, qualunque sia lo strumento attivo (codici già misurati nella prova tecnica: `buttons & 32`, `buttons & 2`, `button === 5`).
66. **Scrivi con il dito**: interruttore nella barra, visibile solo se `haPenna`. Quando è acceso un dito scrive e due dita scorrono.
67. **Tasto Indietro del telefono**: chiude un livello alla volta (regola 66): prima il foglio o il menu aperto, poi il documento, poi esce.

### F5. Strumenti della 2.0

68. **Barra**: sulla disposizione larga è verticale, sul lato destro (a sinistra per chi lo sceglie nelle Impostazioni); sulla stretta è orizzontale, in basso.

| Ordine | Elemento | Cosa fa | Tasto |
|---|---|---|---|
| 1 | Scrivi con il dito | Solo con penna. Vedi punto 66 | - |
| 2 | Penna | Tratto che segue la pressione | P |
| 3 | Evidenziatore | Colore che resta sotto il testo | E |
| 4 | Gomma | Cancella il segno intero che tocca | G |
| 5 | 3 colori rapidi | Gli ultimi 3 usati con lo strumento attivo | - |
| 6 | Spessore | Apre le opzioni dello strumento attivo | - |
| 7 | Annulla, Ripeti | Fino a 200 passi, nella sessione | Ctrl+Z, Ctrl+Maiusc+Z |
| 8 | Leggi | Torna alla Lettura | Esc |

69. **Opzioni a un tocco**: toccando di nuovo lo strumento attivo si aprono le sue opzioni (pannello accanto alla barra sulla disposizione larga, foglio dal basso sulla stretta). Si chiudono toccando fuori.
70. **Penna**: 5 spessori (1,20 - 1,80 - 2,60 - 3,60 - 4,80 punti PDF); 6 colori: Inchiostro #0E1D2A, Blu #2E5E9E, Ruggine #B4544A, Verderame #2F9184, Acciaio #71879A, Ottone #C99A4E; interruttore Raddrizza tenendo premuto. All'inizio: Blu, 1,80.
71. **Evidenziatore**: 5 spessori (8 - 11 - 14 - 19 - 24 punti PDF); 4 colori: Giallo #F5DE8C, Verde #BFE3CF, Rosa #F3C4BE, Azzurro #BFDCEB; interruttore Linea dritta automatica. All'inizio: Giallo, 14.
72. **Gomma**: cancella per intero ogni segno toccato; nelle opzioni c'è "Cancella i segni di questa pagina", con Annulla nell'avviso.
73. **Raddrizza tenendo premuto**: se la punta resta ferma 0,60 secondi a fine tratto (spostamento sotto 3 px) e il tratto ha almeno 7 punti, diventa una linea retta dal primo punto alla punta, e continua a seguire la punta finché non si alza.
74. **Linea dritta automatica**: al rilascio, se il tratto dell'evidenziatore è alto meno di 18 px e largo più di 30 px sullo schermo, diventa una linea orizzontale alla quota media.
75. **Lo spessore è della carta, non dello schermo**: è in punti PDF, quindi ingrandendo la pagina il tratto appare più grosso, come inchiostro vero sotto una lente.
76. **Salvataggio**: ogni segno è salvato entro 0,30 secondi; uscendo dal documento o mandando l'app in secondo piano si salva subito. Sotto il nome compare "Salvato".

### F6. Menu del documento, ricerca, pagine

77. **Menu con tre puntini** (ordine fisso, regola 68): Cerca nel testo, Vai alla pagina, Aggiungi pagina (solo nei documenti vuoti creati da plico); Rinomina, Sposta in una cartella, Aggiungi ai preferiti; Condividi, Salva una copia; Dettagli; Sposta nel cestino, per ultima.
78. **Cerca nel testo**: barra con campo, "{i} di {n}", precedente, successivo, chiudi; i risultati sono evidenziati sulla pagina.
79. **Vai alla pagina**: campo numerico con il totale accanto.
80. **Condividi**: genera il PDF con i segni e apre la condivisione del sistema; dove non c'è, lo scarica.
81. **Salva una copia**: scarica il PDF con i segni, con il nome del documento.
82. **Documento senza segni**: Condividi e Salva una copia danno il file originale, identico byte per byte.
83. **Dettagli**: nome, cartella, pagine, peso, creato, modificato, numero di segni.

### F7. Errori e avvisi

84. **Salvataggio fallito**: striscia fissa in alto con il testo della tabella al punto 33 e due scelte: Salva una copia, Riprova. Non sparisce da sola.
85. **PDF protetto da password**: foglio con il campo Password. plico non salva la password: la richiede a ogni apertura.
86. **Annotazioni fatte con altre app**: si vedono come parte della pagina; plico non le modifica.
87. **Avvisi**: in basso, sopra la barra; 3 secondi quelli semplici, 6 secondi quelli con Annulla.

### F8. Impostazioni e Guida

88. **Sezioni**, chiudibili sulla disposizione stretta (regola 67):
    - **Scrittura**: lato della barra (Destra, Sinistra; solo disposizione larga); Raddrizza tenendo premuto; Linea dritta automatica.
    - **Aspetto**: Tema (Automatico, Chiaro, Scuro); Animazione di avvio.
    - **Archivio**: spazio usato; protezione dalla pulizia automatica, con stato e "i"; Esporta tutto; Importa una copia; data dell'ultima copia; Svuota il cestino.
    - **Guida**.
    - **Informazioni**: versione, "by **nautargo**", licenze.
89. **Sincronizzazione**: la sezione compare dalla 2.1. Nella 2.0 non c'è nessuna voce spenta (regola 37).
90. **Guida**: cinque paragrafi fissi, testo nell'appendice A7.
91. **Tema scuro**: scurisce l'interfaccia e il piano dietro le pagine. Le pagine restano del colore del PDF.

### F9. Avvio

92. **Splash** (regole 60 e 61): il foglio compare, il segno ottone si disegna, poi il nome "plico" e "by **nautargo**". Dura 1,10 secondi in tutto. Non blocca i tocchi. Non parte se è spenta nelle Impostazioni, se il sistema chiede meno movimento, o ricaricando nella stessa sessione.
93. **Senza rete**: dalla seconda apertura plico parte anche senza rete.
94. **Aggiornamento**: quando c'è una versione nuova compare "Nuova versione pronta [Aggiorna]"; il tocco ricarica.

## G. Grafica

95. **Colori**: questi sono i soli colori dell'interfaccia.

```css
:root {
  --fondo: #E9EDEC;        /* Nebbia: fondo pagina */
  --piano: #DDE3E2;        /* piano dietro le pagine del PDF */
  --carta: #F9FBFA;        /* pannelli, barre */
  --rialzo: #FFFFFF;       /* schede, menu, fogli */
  --testo: #0E1D2A;        /* Inchiostro */
  --testo-2: #5A6670;      /* testo secondario */
  --linea: #CAD2D2;
  --accento: #C99A4E;      /* Ottone su chiaro: riempimenti, bordi, selezione */
  --accento-tenue: #F0E4CE;
  --su-accento: #0E1D2A;   /* testo e icone sopra l'ottone */
  --ok: #2F9184;           /* Verderame */
  --no: #B4544A;           /* Ruggine */
  --ombra: 0 6px 24px rgba(14, 29, 42, .12), 0 1px 3px rgba(14, 29, 42, .10);
}
@media (prefers-color-scheme: dark) { :root:not([data-tema="chiaro"]) { /* stessi valori del blocco qui sotto */ } }
:root[data-tema="scuro"] {
  --fondo: #0A1620; --piano: #07111A; --carta: #0E1D2A; --rialzo: #13263A;
  --testo: #E9EDEC; --testo-2: #93A1AB; --linea: #29405A;
  --accento: #E8A867; --accento-tenue: #3A3226; --su-accento: #0E1D2A;
  --ok: #4FB3A5; --no: #D47A70;
  --ombra: 0 6px 24px rgba(0, 0, 0, .45), 0 1px 3px rgba(0, 0, 0, .40);
  color-scheme: dark;
}
```

96. **Ottone e testo**: l'ottone si usa per riempimenti, bordi, selezione e icone da 24 px in su. Sopra l'ottone il testo è Inchiostro. Niente testo piccolo color ottone su fondo chiaro: non si legge abbastanza.
97. **Caratteri** (regole 49 e 51): Space Grotesk 400, 500, 600 per l'interfaccia; Space Mono 400 per le cifre (pagine, pesi, versione); Poppins 600 solo per il nome "plico". Tutti dentro l'app, sottoinsieme latino, 64 KB in tutto.
98. **Scala del testo**: 12,5 - 14 - 15 - 16 - 18 - 22 - 28 px. Interlinea 1,35.
99. **Misure**: bersagli di tocco di almeno 44 x 44 px; raggi 14 px (pulsanti), 20 px (schede, fogli, menu), 999 px (pillole); barra in alto 56 px; barra in basso 64 px più l'area sicura; pannello 264 px; barra strumenti 64 px.
100. **Icone** (regola 71): a tratto, 24 x 24, spessore 1,7, estremità tonde, colore `currentColor`. Si riusano quelle della prova tecnica e dei mock-up.
101. **Marchio** [proposto] (regola 56): un foglio Nebbia con l'angolo piegato e un segno Ottone, su fondo Inchiostro; tre colori pieni. Sorgente nell'appendice A6. Nella barra: marchio a 28 px e accanto "plico" in Poppins 600, senza punto (regola 55).
102. **Movimento** (regola 62): solo passaggi fra viste e apertura di fogli e menu, 150 millisecondi; tutto spento con "riduci movimento".

## H. Dati

### H1. Archivio sul dispositivo

103. **Un solo sistema**: IndexedDB, base dati `plico`, versione 1. All'installazione plico chiede la protezione dalla pulizia automatica (`navigator.storage.persist()`) e mostra lo spazio con `navigator.storage.estimate()`.

| Archivio | Chiave | Contenuto |
|---|---|---|
| `documenti` | `id` | Scheda del documento (punto 104) |
| `basi` | id del documento | Blob del PDF originale. Non cambia mai dopo l'importazione |
| `miniature` | id del documento | Blob WebP della prima pagina con i suoi segni, larga 320 px |
| `segni` | `chiave` = `{doc}:{id}`, indice su `doc` | Un segno per riga (punto 105) |
| `cartelle` | `id` | `{ id, nome, colore, genitore, ordine, creato, modificato, eliminato, rimosso }` |
| `impostazioni` | nome | Valori singoli: `tema`, `splash`, `latoBarra`, `raddrizza`, `lineaDritta`, `vista`, `ordine`, `haPenna`, `letturaScelta`, `strumento`, `colori`, `spessori`, `ultimaCopia`, `ultimoAperto`, `dropbox`, `soloWifi` |
| `remoti` | id del documento | Solo con Dropbox: stato di sincronizzazione del documento su questo dispositivo (punto 156c). Non va in `libreria.json` |
| `arrivi` | automatica | File ricevuti con "Condividi > plico", in attesa di importazione |

104. **Scheda del documento**:

```js
{
  id: 'k3f9x2ab',            // 8 caratteri casuali, lettere minuscole e cifre
  nome: 'Contratto di locazione',
  cartella: null,            // id della cartella, null = nessuna
  preferito: false,
  origine: 'importato',      // 'importato' | 'vuoto'
  stile: null,               // solo per 'vuoto': 'bianco' | 'righe' | 'quadretti'
  pagine: 12,
  peso: 1300234,             // byte del PDF originale
  impronta: '9f2c41d07ab35e18', // primi 16 caratteri esadecimali dello SHA-256 del PDF originale
  protetto: false,           // true se chiede una password per aprirsi
  creato: 1794669000000,     // millisecondi
  modificato: 1794669000000, // nome, cartella, preferito
  aperto: 1794669000000,     // ultima apertura
  pagina: 1,                 // pagina a cui riaprire
  segniModificato: 0,        // ultima modifica dei segni
  conSegni: false,           // almeno un segno non eliminato
  eliminato: null,           // null, oppure il momento in cui è finito nel Cestino
  rimosso: null              // null, oppure il momento di "Elimina per sempre": la scheda resta come lapide per 90 giorni, senza PDF né segni
}
```

### H2. Segno

105. **Forma di un segno**. Le coordinate sono in punti PDF della pagina, come le dà pdf.js (`viewport.convertToPdfPoint`), arrotondate a 0,01.

```js
// in tutti i segni
{ id: 'm2p8q1zx', doc: 'k3f9x2ab', chiave: 'k3f9x2ab:m2p8q1zx', tipo: 'tratto', pagina: 0,   // pagina da 0
  modificato: 1794669000000, eliminato: false }    // eliminato: true = lapide, serve a unire fra dispositivi

// tipo 'tratto': penna, evidenziatore e, dalla 2.2, forme
{ strumento: 'penna',          // 'penna' | 'evidenziatore' | 'forma'
  colore: '#2E5E9E',
  spessore: 1.8,               // punti PDF
  scala: 1.6,                  // px CSS per punto PDF al momento della scrittura (pageView.viewport.scale)
  punti: Float32Array }        // [x, y, pressione, x, y, pressione, ...], pressione da 0.05 a 1

// tipo 'evidenzia' (dalla 2.2): evidenziazione agganciata al testo
{ colore: '#F5DE8C', riquadri: [[x0, y0, x1, y1]] }

// tipo 'testo' (dalla 2.2)
{ colore: '#0E1D2A', corpo: 12, testo: 'Nota', rett: [x0, y0, x1, y1] }
```

106. **Dal segno al contorno** [fatto]: il contorno pieno di un tratto si calcola con perfect-freehand sui punti moltiplicati per `scala`, poi si riporta in punti PDF. Parametri unici per schermo e PDF: `size` = 0,755 x spessore x scala per la penna (spessore x scala per evidenziatore e forme), `thinning` 0,63 per la penna (0 per gli altri), `smoothing` 0,5, `streamline` 0,15, `simulatePressure: false`, `last: true`. Codice: `poligonoDi` nell'appendice A1.
107. **Pressione**: con la penna è quella del dispositivo, mai sotto 0,05. Con dito e mouse si ricava dalla velocità: `p = limita(0,8 - distanza_px / 40, 0,3, 0,8)`; primo punto 0,55.
108. **Punti**: si scarta un punto a meno di 0,8 px dal precedente. Si usano anche i punti intermedi (`getCoalescedEvents`).
109. **Segni eliminati**: restano come lapidi (`eliminato: true`, `modificato` aggiornato) per 90 giorni, poi si tolgono.

### H3. Il file PDF di plico

110. **Principio** [fatto]: il PDF originale non viene mai toccato. Quando serve un file (Condividi, Salva una copia, sincronizzazione), plico compone: originale, blocco plico, aggiornamento scritto da pdf.js.

```text
[ PDF originale, byte per byte ]
[ %plico1 <lunghezza originale> <impronta> <numero di caratteri>      <- blocco plico: righe di commento
  %<dati dei segni: JSON compresso, in base64, righe da 76 caratteri> ]
[ aggiornamento in coda scritto da pdf.js: annotazioni, nuovo indice, %%EOF ]
```

111. **Cosa vede un altro lettore**: annotazioni standard con il loro aspetto già disegnato, autore "plico".

| Segno | Annotazione PDF | Note |
|---|---|---|
| Penna, forme | Stamp con contorni pieni: una per pagina e per colore | Opaca, come l'inchiostro. Anche 500 tratti stanno in 2-3 annotazioni |
| Evidenziatore a mano | Ink con intento InkHighlight: una per tratto | Fusione "moltiplica": il testo resta leggibile sotto |
| Evidenziazione del testo (2.2) | Highlight con QuadPoints | Fusione "moltiplica" |
| Testo (2.2) | FreeText in Helvetica | Accenti e simbolo dell'euro verificati |

112. **Cosa rilegge plico**: non le annotazioni, ma il blocco plico, che contiene i segni completi (punti, pressione, strumento, lapidi). Per questo i segni tornano modificabili su un altro dispositivo.
113. **Ricomporre non accumula** [fatto]: si compone sempre dall'originale, quindi il file non cresce salvando più volte.
114. **Se un'altra app modifica il file**: il blocco plico non si trova più alla posizione dichiarata, oppure dopo di esso c'è più di un "%%EOF". plico allora tiene il file intero come nuovo originale: i segni di prima restano visibili ma non sono più modificabili.
115. **Nessun segno**: il file composto è l'originale, senza blocco.
116. **Ordine dentro la pagina**: prima le evidenziazioni, poi i tratti di penna, poi il testo. Lo stesso ordine vale a schermo.
117. **Codice di riferimento**: `componi` e `scomponi` nell'appendice A2. Sono stati provati e vanno usati così come sono.

### H4. Copia di sicurezza

118. **Formato**: `plico-copia-AAAA-MM-GG.zip` (oltre 1,00 GB: `plico-copia-AAAA-MM-GG-1.zip`, `-2.zip` e così via, ciascuna completa di `libreria.json`), senza compressione, con dentro `libreria.json` (cartelle, schede dei documenti, impostazioni non legate al dispositivo) e `Documenti/{nome} - {id}.pdf` per ogni documento non nel Cestino, composto come al punto 110.
119. **Importare una copia**: si possono scegliere più parti insieme. plico mostra quanti documenti e quante cartelle contiene, poi chiede Unisci o Sostituisci. Unisci: per ogni id tiene la scheda più recente e unisce i segni uno per uno (vince il più recente; le lapidi contano). Sostituisci: manda nel Cestino i documenti attuali, poi importa.
120. **Codice di riferimento**: `creaZip` e `leggiZip` nell'appendice A4.

## I. Tecnica

### I1. Repository e costruzione

121. **Struttura**:

```text
index.html              generato da build.mjs: non si modifica a mano
sw.js                   generato da build.mjs
manifest.webmanifest
CNAME, LICENZE.txt
icone/                  plico.svg, icona-192.png, icona-512.png, icona-maschera-512.png
esempi/prova.pdf        documento di prova offerto nella libreria vuota
lib/pdfjs/              terze parti: pdf.min.mjs, pdf.worker.min.mjs, pdf_viewer.mjs, pdf_viewer.css,
                        images/, standard_fonts/, wasm/, cmaps/, LICENSE
build.mjs               appendice A5
src/
  versione.json         { "versione": "2.0.0" }
  00-guscio.html        pagina con i segnaposto <!--STILE--> e <!--CODICE-->
  10-stile.css          colori, caratteri, componenti
  font/                 file .woff2
  servizio/sw.js        service worker, con {{VERSIONE}}
  20-base.js            utilità, formati italiani, id, eventi
  25-interfaccia.js     icone, foglio dal basso, menu, avviso, conferma
  30-archivio.js        IndexedDB
  35-freehand.js        perfect-freehand (terze parti, MIT)
  36-segni.js           appendice A1
  37-unione.js          unione di schede, cartelle e segni (puro), usata da copia di sicurezza e Dropbox
  40-pdf.js             appendice A2, più apertura e miniature
  41-vuoto.js           appendice A3
  42-zip.js             appendice A4
  50-libreria.js
  60-documento.js       visore, Lettura, barre, ricerca
  65-scrittura.js       tele, ingressi, strumenti, annulla
  70-impostazioni.js    impostazioni, guida, copia di sicurezza
  78-dropbox.js         client Dropbox: collegamento, chiamate, caricamento a pezzi
  80-sync.js            giro di sincronizzazione e stato
  90-avvio.js           percorsi, splash, service worker, aggiornamento
prove/                  prove automatiche e schermate
docs/                   questo documento, handoff, memoria-office-pdf.md
```

122. **Costruzione** [fatto]: `node build.mjs` unisce i sorgenti in un solo index.html, incorpora i font e scrive la versione. Non richiede pacchetti. Un modulo importa solo da moduli con numero più basso, con la forma `import { a, b } from './NN-nome.js';`, ed esporta con `export function`, `export async function`, `export const`, `export class`.
123. **Nessun framework** (regola 76): JavaScript semplice e DOM. Le sole dipendenze sono pdf.js e perfect-freehand.
124. **perfect-freehand**: `src/35-freehand.js` è `lib/perfect-freehand.mjs` con l'intestazione della licenza e con l'ultima istruzione `export{...}` sostituita da `export const getStroke = R;`.
125. **pdf.js** [fatto il 15/11/2026: worker minificato e `cmaps/` copiati dal pacchetto; `pdf_viewer.mjs` del repository è una versione minificata del file del pacchetto e resta così]: si tengono `pdf.min.mjs`, `pdf_viewer.mjs`, `pdf_viewer.css`, `images/`, `standard_fonts/`, `wasm/`. Il worker si sostituisce con quello minificato della stessa versione, `legacy/build/pdf.worker.min.mjs` del pacchetto npm `pdfjs-dist@6.4.299` (1,26 MB invece di 2,31 MB) [fatto: i file del repository sono identici a quelli del pacchetto]. Si aggiunge `cmaps/` dallo stesso pacchetto (1,11 MB, scaricati solo se un PDF li richiede).
126. **Font**: dai pacchetti npm `@fontsource/space-grotesk`, `@fontsource/space-mono`, `@fontsource/poppins`, file `files/{nome}-latin-{peso}-normal.woff2`, copiati in `src/font/` [fatto: i file esistono].

### I2. Moduli

| Modulo | Compito | Funzioni principali |
|---|---|---|
| `20-base.js` | Utilità | `id()`, `data(ms)`, `peso(byte)`, `senzaAccenti(testo)`, `emetti` e `ascolta` per gli eventi interni |
| `25-interfaccia.js` | Componenti | `icona(nome)`, `foglio(...)`, `menu(...)`, `avviso(testo, { azione })`, `conferma(testo)` |
| `30-archivio.js` | IndexedDB | `apri()`, `leggi(archivio, chiave)`, `tutti(archivio)`, `scrivi(archivio, valore)`, `togli(archivio, chiave)`, `segniDi(doc)`, `spazio()` |
| `36-segni.js` | Motore puro | `poligonoDi`, `semplifica`, `asseDi`, `impacchetta`, `spacchetta`, più `tocca(segno, x, y, raggio)` e `unisci(a, b)` da scrivere |
| `37-unione.js` | Unione pura | `unisciRecord(locali, remoti)`, `unisciSegni(locali, remoti)`: per id vince il `modificato` più recente; le lapidi contano |
| `78-dropbox.js` | Client Dropbox | `collega()`, `completaCollegamento()`, `chiama(rotta, arg)`, `scarica(percorso)`, `carica(percorso, blob, rev)`, `elenca()`, `scollega()` |
| `80-sync.js` | Sincronizzazione | `giro()`, `programma(motivo)`, `stato()` |
| `40-pdf.js` | pdf.js | `carica()`, `apriDocumento(blob, password)`, `miniatura(doc, segni)`, `componi`, `scomponi`, `scomponiBlob` |
| `41-vuoto.js` | PDF vuoti | `pdfVuoto(pagine, stile)` |
| `42-zip.js` | Copia | `creaZip(voci)`, `leggiZip(file)` |
| `50-libreria.js` | Libreria | `mostraLibreria(vista)`, `importa(file)`, `nuovoVuoto(stile)` |
| `60-documento.js` | Documento | `apri(id)`, `chiudi()`, `stato(nuovo)`, `cerca(testo)`, `vaiA(pagina)` |
| `65-scrittura.js` | Scrittura | `attiva(visore)`, `disattiva()`, `strumento(nome)`, `annulla()`, `ripeti()` |
| `70-impostazioni.js` | Impostazioni | `mostraImpostazioni()`, `esportaTutto()`, `importaCopia(file, modo)` |
| `90-avvio.js` | Avvio | percorsi `#libreria`, `#doc-{id}`, `#impostazioni`, `#guida` |

127. **Chi sa cosa**: solo `30-archivio.js` tocca IndexedDB; solo `40-pdf.js` tocca pdf.js per aprire e comporre; `36-segni.js`, `41-vuoto.js`, `42-zip.js` non toccano né il DOM né l'archivio (regola 83).

### I3. pdf.js: come si usa

128. **Caricamento**, come nella prova tecnica, una volta sola e solo quando serve:

```js
const pdfjs = await import('./lib/pdfjs/pdf.min.mjs');
globalThis.pdfjsLib = pdfjs;                               // serve prima di caricare il visore
const visore = await import('./lib/pdfjs/pdf_viewer.mjs');
pdfjs.GlobalWorkerOptions.workerSrc = new URL('lib/pdfjs/pdf.worker.min.mjs', location.href).href;
const OPZIONI = { standardFontDataUrl: new URL('lib/pdfjs/standard_fonts/', location.href).href,
                  wasmUrl: new URL('lib/pdfjs/wasm/', location.href).href,
                  cMapUrl: new URL('lib/pdfjs/cmaps/', location.href).href, cMapPacked: true };
```

129. **Visore**:

```js
const bus = new visore.EventBus();
const collegamenti = new visore.PDFLinkService({ eventBus: bus, externalLinkTarget: visore.LinkTarget.BLANK });
const trova = new visore.PDFFindController({ eventBus: bus, linkService: collegamenti });
const v = new visore.PDFViewer({
  container,                      // elemento con position: absolute e overflow: auto
  viewer: pagine,                 // div con classe "pdfViewer" dentro container
  eventBus: bus, linkService: collegamenti, findController: trova,
  textLayerMode: 1,
  annotationMode: pdfjs.AnnotationMode.ENABLE,
  annotationEditorMode: pdfjs.AnnotationEditorType.DISABLE   // l'editor di pdf.js resta spento
});
collegamenti.setViewer(v);
const compito = pdfjs.getDocument({ range: new TrasportoBlob(blob), length: blob.size, password,
                                   rangeChunkSize: 1048576, disableAutoFetch: true, disableStream: true, ...OPZIONI });
// TrasportoBlob estende pdfjs.PDFDataRangeTransport: requestDataRange(da, a) legge blob.slice(da, a) e risponde con onDataRange(da, pezzo)
compito.onPassword = (rispondi, motivo) => { /* chiedi la password, poi rispondi(password) */ };
const doc = await compito.promise;
v.setDocument(doc); collegamenti.setDocument(doc); trova.setDocument(doc);
bus.on('pagesinit', () => { v.currentScaleValue = stretta ? 'page-width' : 'auto'; v.currentPageNumber = scheda.pagina; });
// alla chiusura: v.setDocument(null); collegamenti.setDocument(null); await compito.destroy();
```

130. **Eventi usati**: `pagesinit`, `pagerendered` (`{ pageNumber, source }`, dove `source` è la vista della pagina), `pagechanging` (`{ pageNumber }`), `scalechanging`, `updatefindmatchescount`, `updatefindcontrolstate`.
131. **Ingrandire**: `v.updateScale({ scaleFactor, origin: [x, y], drawingDelay: 400 })` tiene fermo il punto sotto le dita e ridisegna dopo 0,40 secondi. Limiti: da 0,50 a 5,00.
132. **Cercare**: `bus.dispatch('find', { source: null, type: '', query, caseSensitive: false, entireWord: false, highlightAll: true, findPrevious: false, matchDiacritics: false })`; per il successivo o il precedente `type: 'again'` con `findPrevious`; alla chiusura `bus.dispatch('findbarclose', { source: null })`.
133. **Miniatura**: pagina 1 su un canvas largo 320 px, sopra i suoi segni con la stessa funzione di disegno, poi `canvas.toBlob(..., 'image/webp', 0.8)`. Si rifà alla chiusura del documento se i segni della pagina 1 sono cambiati.
134. **Pagine**: per i documenti vuoti, Aggiungi pagina rigenera l'originale con `pdfVuoto(pagine + 1, stile)`. Per gli altri PDF le operazioni sulle pagine arrivano in 2.2 con `doc.extractPages(...)` di pdf.js [fatto: eliminare, inserire e riordinare funzionano].

### I4. Scrittura: tele, ingressi, annulla

135. **Tele**: i segni si disegnano su canvas sopra la pagina di pdf.js. A ogni `pagerendered` plico controlla che la pagina abbia le sue tele, le ricrea se pdf.js le ha tolte, e ridisegna.

```text
div.page (pdf.js)
  canvasWrapper        pdf.js: la pagina
  textLayer            pdf.js: testo selezionabile
  annotationLayer      pdf.js: collegamenti
  canvas.tela-ev       evidenziatore; CSS mix-blend-mode: multiply; creata solo se la pagina ha evidenziazioni
  canvas.tela-penna    penna e forme
canvas.tela-viva       una sola, sopra tutto il visore, per il tratto in corso
```

135b. **Tele e memoria**: le tele esistono solo per le pagine che pdf.js tiene disegnate. Quando pdf.js libera una pagina (evento `pagerender` con pagina azzerata, oppure la pagina perde il suo `canvasWrapper`), plico porta le sue tele a `width = 0` e `height = 0` e le dimentica. Ogni tela si ricrea al successivo `pagerendered`.
136. **Misura delle tele**: stessi pixel del canvas di pdf.js (`pageView.canvas.width` e `height`), larghezza e altezza CSS al 100% della pagina. Così durante l'ingrandimento seguono la pagina e a fine gesto vengono ridisegnate nitide.
137. **Disegno**: `ctx.setTransform(sx, 0, 0, sy, 0, 0)` con `sx = canvas.width / viewport.width`, poi `ctx.transform(...viewport.transform)`; da lì i contorni si disegnano direttamente in punti PDF, con `fill()`.
138. **Tratto in corso**: a ogni fotogramma si ricalcola il contorno di tutto il tratto e si ridisegna sulla tela viva (come nella prova tecnica). Al rilascio il tratto passa alla tela della pagina e la tela viva si pulisce. La tela viva usa `getContext('2d', { desynchronized: true })` [da verificare: se sfarfalla, si toglie l'opzione].
139. **Una pagina per tratto**: il tratto appartiene alla pagina dove inizia e viene ritagliato ai suoi bordi.
140. **Ingressi in Scrittura**: il contenitore del visore ha `touch-action: none` e `user-select: none`; `textLayer` e `annotationLayer` hanno `pointer-events: none`. Si usano gli eventi `pointerdown`, `pointermove`, `pointerup`, `pointercancel` sul contenitore; la pagina si trova con `elementFromPoint(x, y).closest('.page')`.
141. **Un dito che scorre** (Scrittura con penna): scorrimento a mano con inerzia: velocità misurata sugli ultimi 100 millisecondi; al rilascio, se supera 0,3 px per millisecondo, la pagina continua a scorrere perdendo il 5% di velocità a fotogramma, finché non scende sotto 0,02 o arriva un nuovo tocco.
142. **Due dita** (Scrittura): distanza e centro dei due tocchi; a ogni movimento `updateScale` con il rapporto fra le distanze e il centro come origine, più lo spostamento del centro.
143. **Ingressi in Lettura**: il contenitore ha `touch-action: pan-x pan-y`, così lo scorrimento è quello del sistema. Le due dita si gestiscono con `touchstart` e `touchmove` non passivi, chiamando `preventDefault()` quando i tocchi sono 2 [da verificare sul Galaxy Tab; se dà problemi, anche la Lettura usa i punti 141 e 142].
144. **Gomma**: per ogni segno della pagina, prima il rettangolo che lo contiene, poi la distanza dal percorso della punta; raggio 12 px sullo schermo più metà spessore. Cancellare segna il segno come eliminato.
145. **Annulla e Ripeti**: pila di operazioni in memoria per il documento aperto, al massimo 200: `{ aggiunti: [...], tolti: [...] }`. Annullare un'aggiunta la segna come eliminata; annullare una cancellazione la ripristina.
146. **Salvataggio**: ogni operazione scrive in `segni` solo i segni cambiati, raccogliendo le scritture per 0,30 secondi; su `visibilitychange` verso nascosto e alla chiusura del documento scrive subito.
147. **Prove automatiche**: i gestori non devono dipendere da `isTrusted`; `setPointerCapture` va dentro `try`, perché le prove inviano eventi sintetici con `pointerType: 'pen'` e `pressure`.

### I5. Service worker, manifest, sicurezza

148. **Service worker**: memoria `plico-{versione}`. Subito: `./`, `index.html`, `manifest.webmanifest`, icone, `lib/pdfjs/pdf.min.mjs`, `pdf.worker.min.mjs`, `pdf_viewer.mjs`, `pdf_viewer.css`, `esempi/prova.pdf`. Alla prima richiesta: `wasm/`, `standard_fonts/`, `cmaps/`, `images/`. Risposta dalla memoria, altrimenti dalla rete. La versione nuova aspetta: l'app mostra l'avviso del punto 94 e al tocco invia `skipWaiting`, poi ricarica.
149. **Condividi > plico**: nel manifest `share_target` con `action: "./ricevi"`, `method: "POST"`, `enctype: "multipart/form-data"`, `params.files: [{ name: "pdf", accept: ["application/pdf", ".pdf"] }]`. Il service worker intercetta il POST, salva i file in `arrivi` e risponde con un reindirizzamento a `./#libreria`; all'avvio l'app importa ciò che trova in `arrivi`.
150. **Apri con** (PC): nel manifest `file_handlers` per `application/pdf`; nell'app `launchQueue.setConsumer(...)`.
151. **Manifest**: `name` e `short_name` "plico", `description` "Leggi i PDF e scrivici sopra a mano", `lang` "it", `display` "standalone", `start_url` e `scope` "./", `background_color` e `theme_color` "#E9EDEC".
152. **Regola di sicurezza** (CSP), nel guscio:

```text
default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline';
img-src 'self' blob: data:; font-src 'self' data: blob:; worker-src 'self' blob:; connect-src 'self' blob:;
object-src 'none'; base-uri 'none'; form-action 'self'
```

153. **Dalla 2.1** si aggiungono a `connect-src` solo `https://api.dropboxapi.com` e `https://content.dropboxapi.com`.

### I6. Obiettivi di prestazione

| Misura | Obiettivo | Misurato nella prova (PC) |
|---|---|---|
| Prima pagina visibile, PDF di 10 pagine | meno di 1,00 s sul tablet | - |
| Salvataggio di un segno | meno di 0,05 s | - |
| Comporre un PDF con 500 tratti | meno di 1,50 s sul tablet | 0,21 s |
| Scomporre lo stesso PDF | meno di 0,20 s sul tablet | 0,01 s |
| Peso aggiunto da 500 tratti | meno di 0,30 MB | 0,19 MB |
| Libreria con 500 documenti | scorrimento fluido | - |
| index.html | meno di 0,40 MB, font compresi | 297 KB (15/11/2026) |
| PDF di 200 MB: prima pagina | meno di 3,00 s sul tablet | 0,94 s con 198,24 MB (15/11/2026) |
| PDF di 200 MB: comporre con 50 tratti | meno di 15,00 s sul tablet, senza chiusura della scheda | 1,52 s con 198,24 MB (15/11/2026) |

### I7. PDF grandi, fino a 200 MB

153b. **Limite**: 200 MB per documento. Un file più grande non si importa: "Questo PDF pesa più di 200 MB: plico non riesce a gestirlo bene su tutti i dispositivi. Non è stato importato."
153c. **Leggere**: il PDF si apre a pezzi da 1 MB dal Blob dell'archivio (punto 129). Sul thread della pagina non c'è mai una copia intera del file. Il worker di pdf.js riserva lo spazio per il file intero, ma lo riempie solo con i pezzi letti.
153d. **Importare**: l'impronta (SHA-256) richiede di leggere il file una volta; la lettura è temporanea e la memoria torna libera subito.
153e. **Comporre**: `componi` riceve l'originale come Blob, lo copia una sola volta nel buffer che passa a pdf.js e usa l'impronta della scheda. Il risultato diventa subito un Blob. Picco previsto: circa 2-3 volte il peso del file [da verificare sul telefono con un PDF di 200 MB]. Se la composizione fallisce per memoria, l'app lo dice e propone "Salva una copia" dell'originale senza segni e "Riprova" (regola 15).
153f. **Scomporre un file scaricato o importato**: `scomponiBlob` cerca il blocco plico solo negli ultimi 16 MB del file e prende l'originale come fetta del Blob, senza copiarlo. Mai una ricerca su tutto il file [fatto: con un PDF di 198 MB l'importazione dura 1,09 s su PC].
153g. **Tele**: punto 135b.
153h. **Limiti detti nella Guida**: un PDF molto grande si apre più lentamente; su un telefono con poca memoria Condividi e Salva una copia di un PDF con segni possono non riuscire.

## L. Sincronizzazione con Dropbox (2.1)

154. **Stato**: costruita il 15/11/2026 e provata con un Dropbox finto e due dispositivi (`prove/sync.cjs`), spenta finché manca la chiave dell'app. Le istruzioni di folio, quando arrivano, si confrontano con questa sezione (punto aperto 187); la chiave va in `src/versione.json` (punto 165b).
155. **Collegamento**: OAuth con PKCE dal browser, senza segreto, con `token_access_type=offline`. Il `code_verifier` e lo `state` restano in `impostazioni` durante il passaggio da Dropbox. Il token di rinnovo resta in `impostazioni.dropbox`. Indirizzo di ritorno: l'indirizzo della pagina (`https://plico.nautargo.com/`; per le prove anche `http://localhost:8080/`), registrato nell'app Dropbox. La chiave di un'app PKCE non è un segreto: può stare in `index.html`.
156. **Cosa c'è su Dropbox**, nella cartella dell'app:

```text
/libreria.json                         indice: cartelle e schede dei documenti, con lapidi
/Documenti/{nome pulito} - {id}.pdf    un PDF per documento, composto come al punto 110; si legge con qualsiasi lettore
/Segni/{id}.json                       i segni del documento: { v: 1, app: 'plico', doc, impronta, aggiornato, segni }
```

156b. **Perché due file per documento** [deciso 23a]: il file dei segni è piccolo e si carica 30 secondi dopo l'ultima modifica. Il PDF si ricompone e si ricarica solo alla chiusura del documento, o quando cambia l'originale. Chi apre da un altro dispositivo unisce i segni del file `.json` e quelli del blocco plico nel PDF: per ogni id vince il più recente.
156c. **Stato locale** (archivio `remoti`, uno per documento): `{ id, revPdf, revSegni, impronta, inviatiSegni, segniNelPdf, percorso }`. `revPdf` e `revSegni` sono le revisioni Dropbox viste l'ultima volta; `inviatiSegni` è il `segniModificato` già caricato nel `.json`; `segniNelPdf` quello già composto nel PDF; `impronta` quella dell'originale caricato. In `impostazioni.dropbox`: `{ chiave, tokenRinnovo, tokenAccesso, scadenza, account, nome, revIndice, ultimoGiro, errore }`.
157. **Una cartella sola** [deciso 23a]: i nomi restano leggibili dal PC, le cartelle vivono solo nell'indice. Si evitano spostamenti, rinomine e doppioni di cartelle su Dropbox. Quando un documento cambia nome, il suo PDF si sposta con `move_v2`.
158. **Unione** (regola 31), codice in `37-unione.js`: record per record. Per cartelle e schede vince il `modificato` più recente; le lapidi (`eliminato`, `rimosso`) contano. Per i segni: unione per id, vince il `modificato` più recente.
159. **Giro di sincronizzazione**, uno alla volta:
    1. Se manca la rete, o "Solo con Wi-Fi" è acceso e la rete non è Wi-Fi: stato "In attesa", fine.
    2. `list_folder` di tutta la cartella dell'app (con `list_folder/continue` finché `has_more`).
    3. Se la `rev` di `/libreria.json` è diversa da `revIndice`: scarica, unisci con le schede e le cartelle locali, salva.
    4. Per ogni documento non rimosso:
       - manca l'originale sul dispositivo: scarica il PDF, `scomponiBlob`, salva originale e segni;
       - l'impronta remota (scheda) è diversa da quella locale: vince la scheda più recente; se sono cambiate tutte e due dall'ultimo giro, quella che perde resta come documento nuovo "{nome} (copia del {data})" (punto 160);
       - la `rev` del `.json` è diversa da `revSegni`: scarica, unisci i segni, salva quelli cambiati;
       - ci sono segni più nuovi di `inviatiSegni`, oppure l'unione ha prodotto segni che Dropbox non ha: carica il `.json` con `mode: update` sulla `rev` di partenza;
       - il documento non è aperto e (`segniModificato` > `segniNelPdf` oppure l'originale è cambiato oppure il PDF manca): componi e carica il PDF.
    5. Se l'indice locale è cambiato: carica `/libreria.json` con `mode: update` sulla `revIndice`.
    6. Per i documenti rimossi: elimina `.pdf` e `.json` (`delete_v2`; "non trovato" va bene).
    7. Se Dropbox risponde che il file è cambiato nel frattempo (409 `conflict`): scarica, unisci, ricomponi, riprova, al massimo 3 volte; poi stato "Errore" con [Riprova].
160. **Originale diverso sullo stesso id**: vince il più recente e l'altro resta come copia "{nome} (copia del {data})". Mai perdite silenziose.
161. **PDF senza blocco plico su Dropbox**: vuol dire "nessun segno nel PDF". Contano i segni del file `.json`.
162. **Quando**: all'avvio, alla chiusura di un documento, 30 secondi dopo l'ultima modifica, al ritorno della rete, al ritorno in primo piano, ogni 2 minuti ad app aperta e in primo piano. "Sincronizza ora" nelle Impostazioni.
162b. **Solo con Wi-Fi**: la voce compare solo dove il browser dice il tipo di rete (`navigator.connection.type`, oggi Chrome su Android). Con la voce accesa e rete mobile, le modifiche restano in coda.
163. **Dettaglio tecnico da non dimenticare**: nell'intestazione `Dropbox-API-Arg` i caratteri non ASCII vanno scritti come `\uXXXX`, altrimenti i nomi con gli accenti falliscono.
163b. **Caricare file grandi**: fino a 8 MB una chiamata `files/upload`; sopra, `upload_session/start`, `append_v2` e `finish` a pezzi da 8 MB letti dal Blob. Un pezzo fallito si riprova fino a 3 volte prima di fermare il giro.
163c. **Scaricare**: `files/download`, risposta letta come Blob e salvata così com'è.
163d. **Errori**: 401 con token scaduto: rinnovo e un nuovo tentativo. 429 o 503: attesa del tempo in `Retry-After` (al massimo 60 secondi), fino a 3 volte. `insufficient_space`: "Lo spazio su Dropbox è finito. I documenti restano su questo dispositivo." Rete assente: "Senza rete". Ogni errore resta visibile nelle Impostazioni con [Riprova].
163e. **Stato a schermo** (regola 13), nella sezione Sincronizzazione e nel pannello a sinistra: "Sincronizzato alle {ora}", "Sincronizzazione in corso", "In attesa", "Senza rete", "Errore: {motivo} [Riprova]". Mai "Sincronizzato" se c'è qualcosa in coda.
163f. **Sezione Sincronizzazione** nelle Impostazioni (compare solo con la chiave): non collegato: "Collega Dropbox" con una riga "I documenti vanno nella cartella Applicazioni/plico del tuo Dropbox." Collegato: account, stato, [Sincronizza ora], Solo con Wi-Fi (dove c'è), [Scollega]. Scollega revoca il token e lascia i documenti sul dispositivo e su Dropbox.
163g. **Regola di sicurezza**: con la chiave, `build.mjs` aggiunge a `connect-src` solo `https://api.dropboxapi.com` e `https://content.dropboxapi.com`. Il passaggio da `www.dropbox.com` per il collegamento è una navigazione, non una chiamata.
163h. **Orologi**: "vince il più recente" usa l'ora di ciascun dispositivo; a parità vince l'id maggiore, così tutti i dispositivi scelgono lo stesso. Un orologio molto sbagliato può far vincere il dispositivo sbagliato: si accetta e si dice nella Guida solo se capita davvero.
163i. **Lapidi**: segni e schede eliminati restano come lapidi 90 giorni. Un dispositivo rimasto senza sincronizzare per più di 90 giorni può far ricomparire qualcosa di eliminato: è un limite accettato.
163l. **iPhone** [da verificare]: con plico aperta dall'icona, il ritorno da Dropbox potrebbe aprirsi in Safari, che ha un archivio separato. Se succede, la Guida dice di collegare Dropbox da Safari prima di aggiungere plico alla schermata Home.
164. **PDF protetti**: il file dei segni si sincronizza sempre; il PDF composto si carica solo alla chiusura del documento, mentre plico conosce ancora la password.

## M. Piano di lavoro

### M1. Regole per chi costruisce

165. **Una fase alla volta**: leggi tutto il documento, poi lavora solo sulla fase indicata da Simo. Non anticipare le fasi successive. Il 15/11/2026 Simo ha indicato insieme le fasi 0, 1 e 2.
165b. **Chiave Dropbox**: in `src/versione.json` come `{ "versione": "2.0.0", "dropbox": "<chiave>" }`; `node build.mjs` la scrive nell'app e apre la regola di sicurezza a Dropbox. Con `"dropbox": ""` la sincronizzazione non compare. Per le prove si può dare la chiave anche con la variabile d'ambiente `PLICO_DROPBOX`.
166. **Scope stretto** (regola 89): fai solo ciò che è scritto. Se manca un dettaglio, scegli la soluzione più semplice e segnala la scelta nell'handoff come [proposto]. Non aggiungere funzioni, impostazioni, librerie.
167. **Codice di riferimento**: le appendici A1-A5 sono state provate. Estraile con uno script fra i segnaposto `<!-- inizio:nome -->` e `<!-- fine:nome -->`, non riscriverle a mano. Se devi cambiarle, spiega perché nell'handoff.
168. **Testi**: usa quelli della tabella al punto 33. Mai lineetta lunga né punto mediano.
169. **Niente dall'esterno**: nessuna libreria oltre a pdf.js e perfect-freehand, nessun indirizzo esterno, nessun framework.
170. **Non toccare** `lib/pdfjs/`, salvo quanto scritto al punto 125.
171. **Accessibilità**: pulsanti veri (`<button>`), etichette `aria-label` sui pulsanti con sola icona, bersagli di almeno 44 px, fuoco visibile, rispetto di "riduci movimento".
172. **Mai perdite silenziose**: ogni errore di lettura o scrittura mostra un messaggio con una scelta.
173. **Prove**: se una prova fallisce, correggi il codice. Non spegnere e non saltare le prove.
174. **Chiusura di una fase**: build pulita; prove verdi; schermate alle misure del punto 37 in chiaro e scuro, salvate in `prove/schermate/`; versione aggiornata in `src/versione.json`; handoff in `docs/`.
175. **Git**: lavora solo sul ramo indicato da Simo. Niente commit su `main` e niente pull request senza richiesta.
176. **Spiegazioni** (regola 94): nell'handoff, ciò che deve fare Simo va scritto a passi numerati, senza gergo.

### M2. Fase 0 - Pulizia (nessuna funzione nuova)

177. **Passi**:
    1. Etichetta git `v1.0-prova-tecnica` sull'attuale `main` (la mette Simo, o chi costruisce con il suo permesso).
    2. Togli `lib/embedpdf/`, `lib/o2p/`, `fonts/`, il vecchio `index.html`. Restano nell'etichetta.
    3. pdf.js come al punto 125. Font come al punto 126.
    4. Sposta `prova.pdf` in `esempi/prova.pdf`. Togli `esempi/contratto-lungo.pdf` (punto aperto 188); per le prove di scorrimento usa `pdfVuoto(200, 'righe')`.
    5. Crea `src/`, `build.mjs` (appendice A5), `src/35-freehand.js` (punto 124), i moduli delle appendici A1-A4.
    6. Guscio minimo: pagina con marchio e nome, service worker, manifest, icone ricavate dall'appendice A6.
    7. `docs/`: questo documento, `memoria-office-pdf.md` (sezione O), `LICENZE.txt` aggiornato.
178. **Fatta quando**: `node build.mjs` produce `index.html`; la pagina si apre senza rete alla seconda visita; la console non mostra errori né violazioni della regola di sicurezza; il repository senza `.git` pesa meno di 6,00 MB.

### M3. Fase 1 - plico 2.0: lettore e scrittura in locale

| Passo | Cosa | Fatto quando |
|---|---|---|
| 1.1 | Stile e componenti: colori, temi, caratteri, icone, foglio dal basso, menu, avviso con Annulla, conferma | Una pagina di prova mostra tutti i componenti in chiaro e scuro, a 360 e a 1333 px |
| 1.2 | Archivio (punti 103-105) | Una prova scrive, rilegge ed elimina un documento con i suoi segni |
| 1.3 | PDF: caricamento, apertura, password, miniatura | `esempi/prova.pdf` si apre: 4 pagine, miniatura salvata |
| 1.4 | Libreria nelle due disposizioni: viste, cartelle, +, importazione, ricerca, ordinamento, menu, Cestino con Annulla, stati vuoti, Riprendi | Storie S3 e S5 |
| 1.5 | Documento in Lettura: visore, scorrimento, ingrandimento, pagina, Vai alla pagina, ricerca nel testo, collegamenti, posizione ricordata, rinomina, menu | In `prova.pdf` la ricerca di "Compenso" trova almeno 1 risultato; riaprendo si torna alla pagina lasciata |
| 1.6 | Scrittura: tele, penna, evidenziatore, gomma, tasto della S Pen, dito e mouse, palmo, annulla, colori, spessori, raddrizza, salvataggio | Storia S2; una prova disegna, ricarica la pagina e ritrova il segno |
| 1.7 | Comporre e scomporre: Condividi, Salva una copia, importazione di un PDF di plico | Storie S1 e S8 |
| 1.8 | Documento vuoto e Aggiungi pagina | Storia S4 |
| 1.9 | Impostazioni, Guida, copia di sicurezza, promemoria | Esporta, poi Importa con Unisci in un archivio vuoto: stessi documenti e stessi segni |
| 1.10 | Service worker, senza rete, aggiornamento, Condividi > plico, Apri con, splash | Storia S6 |
| 1.11 | Collaudo e misure (tabella I6) | Tutte le storie da S1 a S6 e S8 passano; misure annotate nell'handoff |

### M4. Fasi successive

179. **Fase 2 - plico 2.1**: Dropbox (sezione L): collegamento, giro di sincronizzazione, conflitti, Solo con Wi-Fi, stato nel pannello e nelle Impostazioni. Storia S7, provata in automatico con un Dropbox finto; con quello vero dopo la chiave.
180. **Fase 3 - plico 2.2**, strumenti avanzati: Seleziona (sposta, ridimensiona, cambia colore, copia, elimina); Forme (linea, freccia, rettangolo, ellisse, tracciate trascinando); Testo; Firma e immagini; evidenziatore agganciato al testo; pannello Pagine con miniature e, per ogni PDF, aggiungi, sposta, elimina; selezione multipla in libreria; doppio tocco per ingrandire; tocco con due dita per annullare; diagnostica della penna.
181. **Fase 4 - plico 2.3**, extra: moduli compilabili; ricerca nel testo di tutta la libreria; altri cloud; cartella "Da importare" su Dropbox; eventuale versione nativa (regola 86).

### M5. Storie d'uso come collaudo (regola 36)

182. **Storie**:
    - **S1**: "Mi arriva un modulo su WhatsApp. Condividi > plico, lo leggo, tocco Scrivi, firmo con il dito, Condividi per rimandarlo. Meno di un minuto."
    - **S2**: "Sul tablet apro una dispensa di 28 pagine. Scrivo a margine con la S Pen, evidenzio due righe, cancello tenendo premuto il tasto della penna. Chiudo, riapro: tutto com'era, alla pagina dov'ero."
    - **S3**: "Sul PC trascino tre PDF nella finestra: compaiono in libreria. Ne apro uno, cerco una parola con Ctrl+F, premo P e sottolineo con il mouse."
    - **S4**: "Creo un documento vuoto a righe, prendo appunti per tre pagine, tocco Salva una copia: il PDF si apre in un altro lettore con gli appunti visibili."
    - **S5**: "Elimino per sbaglio un documento: Annulla lo riporta. Oppure lo ritrovo nel Cestino."
    - **S6**: "In aereo, senza rete: apro plico dall'icona, leggo e scrivo come sempre."
    - **S7** (2.1): "Scrivo sul tablet, poi apro il telefono: stessi segni. Scrivo su entrambi senza rete: alla connessione i segni si uniscono."
    - **S8**: "Importo un PDF che avevo esportato da plico: i segni si cancellano uno per uno con la gomma."

### M6. Prove automatiche

183. **Dove e come**: cartella `prove/`. I moduli puri si provano con `node --test` importando i sorgenti; il resto con Playwright in Chromium sul file costruito.
184. **Prove minime della 2.0**: costruzione (index.html esiste, pesa meno di 0,40 MB, non contiene indirizzi esterni); `impacchetta` e `spacchetta` andata e ritorno; `creaZip` e `leggiZip` andata e ritorno; `pdfVuoto` aperto da pdf.js; `componi` poi `scomponi` con originale identico e segni uguali, su `prova.pdf` e su un PDF vuoto; riapertura con pdf.js del file composto: annotazioni con autore "plico"; importazione, apertura, ricerca; disegno con eventi sintetici di penna, ricarica, segno ancora presente; gomma e Annulla; copia di sicurezza andata e ritorno; avvio senza rete; schermate alle misure del punto 37.

### M7. Handoff (regola 92)

185. **A ogni fase**: file `docs/plico-handoff-{versione}.md` con: stato; file per ripartire; modifiche fatte; decisioni prese, con etichetta; misure; punti aperti; cosa deve fare Simo, a passi numerati.

## N. Cosa deve fare Simo

186. **Passi**:
    1. Rispondere ai punti aperti qui sotto.
    2. Guardare il nuovo mock-up su telefono, tablet e PC, e provare la scrittura con la S Pen.
    3. Dare il via alla fase 0 indicando il ramo.
    4. A fine fase 1, provare sul Galaxy Tab i tre punti [da verificare]: 138, 143 e il palmo (punto 64).
    5. Per accendere Dropbox: creare l'app su Dropbox (accesso alla sola cartella dell'app, indirizzo di ritorno `https://plico.nautargo.com/`) e passare la chiave dell'app, con le istruzioni di folio. I passi esatti sono nell'handoff.

## O. Memoria: Office in PDF

Il convertitore funzionava ma pesa quasi 17 MB: esce dall'app, resta nell'etichetta `v1.0-prova-tecnica` e questa memoria basta a riprenderlo.

- **Cosa c'era**: office2pdf 0.8.1 compilato in WebAssembly (contiene Typst 0.15 e i suoi font), compresso con gzip e diviso in due parti da 12,00 MB e 4,93 MB per il limite di 15 MB per file dell'anteprima in chat.
- **Come funzionava**: un worker (`lib/o2p/worker.js`) scarica le parti, le riunisce, le decomprime con `DecompressionStream` e crea un `Office2PdfConverter`. Due comandi: `fonts` registra i font compatibili; `convert` riceve byte e formato (docx, xlsx, pptx) e risponde con PDF, tempi e avvisi.
- **Font compatibili**: Carlito per Calibri, Caladea per Cambria, Liberation Sans e Serif per Arial e Times; 16 file, 5,95 MB.
- **Avvisi gestiti**: `fallback-used`, `unsupported-element`, `partial-element`, `parse-skipped`.
- **Provato con**: 9 documenti pubblici dell'archivio di prova di Apache POI (3 Word, 3 Excel, 3 PowerPoint).
- **Alternativa a costo zero**: Word, Excel, PowerPoint e Google Documenti su Android esportano già in PDF; con "Condividi > plico" il PDF entra in libreria.
- **Come riprenderlo**: `git checkout v1.0-prova-tecnica -- lib/o2p fonts`, poi un modulo facoltativo scaricato solo al primo uso e fuori dalla memoria principale del service worker.

---

## Note

- **Prove fatte il 14/11/2026** [fatto], in Chromium con il pdf.js del repository: composizione e scomposizione su PDF normale, compresso (indice e oggetti in flussi), linearizzato, ruotato, protetto AES-256, protetto RC4-128, di 175 pagine, e su una pagina con 500 tratti. In tutti i casi: originale ritrovato identico, segni identici, 0 errori di sintassi secondo qpdf, resa corretta in poppler e MuPDF, che sono motori diversi da pdf.js.
- **Limite noto del tratto**: con scarabocchi molto fitti e una penna grossa possono comparire sottili linee più chiare dentro la macchia. Vale allo stesso modo a schermo e nel PDF. Accettato.
- **Semplificazione dei contorni**: nel PDF i contorni perdono i punti che spostano il bordo meno di 0,03 punti. A 200 punti per pollice non cambia nemmeno un pixel e il file pesa il 22% in meno.
- **Font di sistema nei PDF**: l'avviso di pdf.js "Font Helv is not available" durante la composizione è innocuo.
- **Il mock-up non è l'app**: nel mock-up i segni non si salvano e il documento è finto.

## Punti aperti

187. **Sincronizzazione e folio**: Simo passa la chiave e le istruzioni di folio; plico si allinea dove le istruzioni di folio sono diverse dalla sezione L.

Risolti il 15/11/2026: 188 (a) `contratto-lungo.pdf` tolto; 189 (a) "segni"; 190 (a) marchio provvisorio; 191 (a) una cartella più indice, con in più i file dei segni (23a); 192 (a) 2.0.0; 193 (a) documento in `docs/`, sul ramo di lavoro indicato nella sessione; 194 (a) nessun testo ottone; 23a, 24a, peso massimo 200 MB, zip in parti.

## Fonti

- `nautargo-identita.md` del 14/11/2026.
- Repository `imo09/plico`: `index.html` della prova tecnica, `LICENZE.txt`, `lib/pdfjs/pdf.worker.mjs` (funzioni `saveNewAnnotations`, `InkAnnotation`, `StampAnnotation`, `HighlightAnnotation`, `incrementalUpdate`, `extractPages`).
- Pacchetti npm verificati: `pdfjs-dist@6.4.299`, `@fontsource/space-grotesk`, `@fontsource/space-mono`, `@fontsource/poppins` (5.3.0).
- Dropbox: [caricamento a sessioni](https://www.dropbox.com/developers/documentation/http/documentation#files-upload_session-start), [piano Basic](https://help.dropbox.com/plans/dropbox-basic-faq), [accesso da app nel browser](https://dropbox.tech/developers/using-oauth-2-0-with-offline-access), [guida per sviluppatori](https://www.dropbox.com/developers/reference/developer-guide).
- pdf.js: `PDFDataRangeTransport` nel file `lib/pdfjs/pdf.min.mjs` (6.4.299).
- Chrome e web.dev: [ricevere file condivisi](https://developer.chrome.com/docs/capabilities/web-apis/web-share-target), [memoria persistente](https://web.dev/articles/storage-for-the-web), [canvas a bassa latenza](https://developer.chrome.com/blog/desynchronized).

---

## Appendici: codice di riferimento

Ogni blocco sta fra due segnaposto. Per estrarli senza errori di copia:

```js
// estrai.mjs - uso: node estrai.mjs docs/plico-progetto-2.0.md
import fs from 'node:fs';
const t = fs.readFileSync(process.argv[2], 'utf8');
for (const m of t.matchAll(/<!-- inizio:(\S+) -->\s*```\w*\n([\s\S]*?)\n```\s*<!-- fine:\1 -->/g)) { fs.mkdirSync(m[1].split('/').slice(0, -1).join('/') || '.', { recursive: true }); fs.writeFileSync(m[1], m[2] + '\n'); console.log('scritto', m[1]); }
```

### A1. Segni: contorni e impacchettamento

<!-- inizio:src/36-segni.js -->
```js
// Riferimento (puro, senza DOM): tratti, contorni, impacchettamento. Dipende solo da getStroke di perfect-freehand.
export function poligonoDi(s, getStroke) {
  // s.punti: Float32Array [x, y, pressione, ...] in punti PDF - s.scala: px per punto al momento della scrittura - s.spessore: punti PDF
  const k = s.scala, n = s.punti.length / 3, pts = new Array(n);
  for (let i = 0; i < n; i++) pts[i] = [s.punti[3 * i] * k, s.punti[3 * i + 1] * k, s.punti[3 * i + 2]];
  const penna = s.strumento === 'penna';
  const o = getStroke(pts, { size: (penna ? 0.755 : 1) * s.spessore * k, thinning: penna ? 0.63 : 0, smoothing: 0.5, streamline: 0.15, simulatePressure: false, last: true });
  const out = new Float32Array(o.length * 2);
  for (let i = 0; i < o.length; i++) { out[2 * i] = Math.round(o[i][0] / k * 100) / 100; out[2 * i + 1] = Math.round(o[i][1] / k * 100) / 100; }
  return out;
}
export function semplifica(p, tol) {
  // Ramer-Douglas-Peucker sul contorno [x, y, ...]: toglie i punti che spostano il bordo meno di "tol" punti PDF
  const n = p.length / 2; if (n < 8) return Array.from(p);
  const tieni = new Uint8Array(n); tieni[0] = tieni[n - 1] = 1;
  const pila = [[0, n - 1]];
  while (pila.length) {
    const [a, b] = pila.pop(); if (b - a < 2) continue;
    const ax = p[2 * a], ay = p[2 * a + 1], dx = p[2 * b] - ax, dy = p[2 * b + 1] - ay, l2 = dx * dx + dy * dy;
    let max = -1, im = -1;
    for (let i = a + 1; i < b; i++) {
      const ex = p[2 * i] - ax, ey = p[2 * i + 1] - ay;
      let t = l2 ? (ex * dx + ey * dy) / l2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const d = Math.hypot(ex - t * dx, ey - t * dy);
      if (d > max) { max = d; im = i; }
    }
    if (max > tol) { tieni[im] = 1; pila.push([a, im], [im, b]); }
  }
  const out = []; for (let i = 0; i < n; i++) if (tieni[i]) out.push(p[2 * i], p[2 * i + 1]);
  return out;
}
export function asseDi(s, ogni = 4) {   // percorso della punta, alleggerito: finisce in /InkList
  const a = [], n = s.punti.length / 3;
  for (let i = 0; i < n; i += ogni) a.push(s.punti[3 * i], s.punti[3 * i + 1]);
  if ((n - 1) % ogni) a.push(s.punti[3 * (n - 1)], s.punti[3 * (n - 1) + 1]);
  return a;
}
export function impacchetta(segni) {    // segni in memoria -> oggetto per JSON (punti come interi a differenze, centesimi di punto)
  return { v: 1, app: 'plico', segni: segni.map(s => {
    const o = {}; for (const k in s) if (k[0] !== '_') o[k] = s[k];
    if (s.punti) { const a = s.punti, d = new Array(a.length); let px = 0, py = 0, pp = 0;
      for (let i = 0; i < a.length; i += 3) { const x = Math.round(a[i] * 100), y = Math.round(a[i + 1] * 100), p = Math.round(a[i + 2] * 100); d[i] = x - px; d[i + 1] = y - py; d[i + 2] = p - pp; px = x; py = y; pp = p; }
      o.punti = d; }
    return o; }) };
}
export function spacchetta(obj) {       // oggetto letto dal JSON -> segni in memoria
  if (!obj || obj.v !== 1 || !Array.isArray(obj.segni)) return [];
  return obj.segni.map(s => { const o = { ...s };
    if (Array.isArray(s.punti)) { const d = s.punti, a = new Float32Array(d.length); let x = 0, y = 0, p = 0;
      for (let i = 0; i < d.length; i += 3) { x += d[i]; y += d[i + 1]; p += d[i + 2]; a[i] = x / 100; a[i + 1] = y / 100; a[i + 2] = p / 100; }
      o.punti = a; }
    return o; });
}
```
<!-- fine:src/36-segni.js -->

### A2. PDF: componi e scomponi

<!-- inizio:src/40-pdf.js -->
```js
// Riferimento: componi e scomponi nel browser. Dipende da pdf.js, da getStroke (perfect-freehand) e da 36-segni.js.
// componi(pdfjs, base, segni, { getStroke, pdfjs: { standardFontDataUrl, wasmUrl }, password, tolleranza }) -> Uint8Array del PDF con i segni
// scomponi(file) -> { base, segni, plico }: se il file non viene da plico, base è il file intero e segni è vuoto
import { poligonoDi, semplifica, asseDi, impacchetta, spacchetta } from './36-segni.js';
const enc = new TextEncoder();
async function comprimi(testo) {
  const s = new Blob([testo]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}
async function espandi(bytes) {
  const s = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
  return await new Response(s).text();
}
function inBase64(bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); }
function daBase64(t) { const s = atob(t); const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; }
async function impronta(bytes) { const h = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)); return Array.from(h.subarray(0, 8), x => x.toString(16).padStart(2, '0')).join(''); }

async function bloccoPlico(base, segni) {
  let json = JSON.stringify(impacchetta(segni)), b64;
  for (;;) { b64 = inBase64(await comprimi(json)); if (!/startxref|%%EOF/.test(b64)) break; json += ' '; }
  const righe = b64.match(/.{1,76}/g).map(r => '%' + r).join('\n');
  const ultimo = base[base.length - 1];
  const nl = (ultimo === 0x0a || ultimo === 0x0d) ? '' : '\n';
  return enc.encode(`${nl}%plico1 ${base.length} ${await impronta(base)} ${b64.length}\n${righe}\n`);
}
const linea = poli => { const a = new Array(poli.length * 3); for (let i = 0, j = 0; i < poli.length; i += 2) { a[j++] = NaN; a[j++] = NaN; a[j++] = NaN; a[j++] = NaN; a[j++] = poli[i]; a[j++] = poli[i + 1]; } return a; };
const rgb = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
function rettangolo(poli, m) { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const p of poli) for (let i = 0; i < p.length; i += 2) { if (p[i] < x0) x0 = p[i]; if (p[i] > x1) x1 = p[i]; if (p[i + 1] < y0) y0 = p[i + 1]; if (p[i + 1] > y1) y1 = p[i + 1]; } return [x0 - m, y0 - m, x1 + m, y1 + m]; }

export async function componi(pdfjs, base, segni, opzioni = {}) {
  const vivi = segni.filter(s => !s.eliminato);
  if (!vivi.length) return base;                                         // nessun segno: il file resta l'originale, byte per byte
  const coda = await bloccoPlico(base, segni);
  const dati = new Uint8Array(base.length + coda.length); dati.set(base); dati.set(coda, base.length);
  const compito = pdfjs.getDocument({ data: dati, password: opzioni.password, ...opzioni.pdfjs });
  const doc = await compito.promise;
  try {
    const T = pdfjs.AnnotationEditorType, st = doc.annotationStorage;
    let n = 0; const metti = v => st.setValue('pdfjs_internal_editor_plico' + (n++), v);
    const pagine = new Map();
    for (const s of vivi) { if (!pagine.has(s.pagina)) pagine.set(s.pagina, []); pagine.get(s.pagina).push(s); }
    for (const [pagina, lista] of pagine) {
      const comune = { pageIndex: pagina, rotation: 0, user: 'plico' };
      for (const s of lista) if (s.tipo === 'evidenzia') {   // 1. evidenziazioni del testo (sotto)
        const quad = [], contorni = [];
        for (const [x0, y0, x1, y1] of s.riquadri) { quad.push(x0, y1, x1, y1, x0, y0, x1, y0); contorni.push([x0, y0, x1, y0, x1, y1, x0, y1]); }
        metti({ ...comune, annotationType: T.HIGHLIGHT, rect: rettangolo(contorni, 0), color: rgb(s.colore), opacity: 1, quadPoints: quad, outlines: contorni });
      }
      const contorno = s => semplifica(s._poligono || (s._poligono = poligonoDi(s, opzioni.getStroke)), opzioni.tolleranza ?? 0.03);
      for (const s of lista) if (s.tipo === 'tratto' && s.strumento === 'evidenziatore') {   // 2. evidenziatore a mano: una nota Ink per tratto, fusione "moltiplica"
        const poli = contorno(s);
        metti({ ...comune, annotationType: T.HIGHLIGHT, rect: rettangolo([poli], 1), color: rgb(s.colore), opacity: 1, thickness: s.spessore, outlines: { outline: linea(poli), points: [asseDi(s)] } });
      }
      const perColore = new Map();                                                    // 3. penna e forme: un timbro vettoriale per colore
      for (const s of lista) if (s.tipo === 'tratto' && s.strumento !== 'evidenziatore') { if (!perColore.has(s.colore)) perColore.set(s.colore, []); perColore.get(s.colore).push(contorno(s)); }
      for (const [colore, poli] of perColore) metti({ ...comune, annotationType: T.SIGNATURE, isSignature: true, areContours: true, rect: rettangolo(poli, 1), color: rgb(colore), thickness: 0, lines: poli.map(linea) });
      for (const s of lista) if (s.tipo === 'testo')                                  // 4. testo da tastiera (sopra)
        metti({ ...comune, annotationType: T.FREETEXT, rect: s.rett, color: rgb(s.colore), fontSize: s.corpo, value: s.testo });
    }
    return await doc.saveDocument();
  } finally { await compito.destroy(); }
}

function cercaIndietro(file, ago) {   // ultima posizione di "ago" (bytes) nel file, -1 se manca
  salta: for (let i = file.length - ago.length; i >= 0; i--) { for (let k = 0; k < ago.length; k++) if (file[i + k] !== ago[k]) continue salta; return i; }
  return -1;
}
export async function scomponi(file) {
  const esterno = { base: file, segni: [], plico: false };
  const ago = enc.encode('%plico1 ');
  const qui = cercaIndietro(file, ago);
  if (qui < 0) return esterno;
  const dec = new TextDecoder('latin1');
  const fineRiga = file.indexOf(0x0a, qui);
  const m = /^%plico1 (\d+) ([0-9a-f]{16}) (\d+)$/.exec(dec.decode(file.subarray(qui, fineRiga)));
  if (!m) return esterno;
  const lung = Number(m[1]), car = Number(m[3]);
  if (qui !== lung && qui !== lung + 1) return esterno;                 // l'intestazione sta subito dopo l'originale
  const base = file.subarray(0, lung);
  if (await impronta(base) !== m[2]) return esterno;
  let i = fineRiga + 1, b64 = '';
  while (b64.length < car && file[i] === 0x25) { const f = file.indexOf(0x0a, i); b64 += dec.decode(file.subarray(i + 1, f)); i = f + 1; }
  if (b64.length !== car) return esterno;
  const resto = dec.decode(file.subarray(i));
  if (resto.length && (resto.match(/%%EOF/g) || []).length !== 1) return esterno;   // qualcun altro ha scritto dopo plico
  try { return { base, segni: spacchetta(JSON.parse(await espandi(daBase64(b64)))), plico: true }; } catch { return esterno; }
}
```
<!-- fine:src/40-pdf.js -->

### A3. PDF vuoto

<!-- inizio:src/41-vuoto.js -->
```js
// Riferimento: genera un PDF A4 vuoto (bianco, righe, quadretti) senza librerie.
export function pdfVuoto(pagine = 1, stile = 'bianco') {
  const L = 595.28, A = 841.89, n2 = v => v.toFixed(2);
  let c = '';
  if (stile === 'righe') { c = '0.79 0.82 0.82 RG 0.5 w\n'; for (let y = A - 85; y > 42; y -= 24) c += `42.5 ${n2(y)} m ${n2(L - 42.5)} ${n2(y)} l S\n`; }
  if (stile === 'quadretti') { const p = 14.173; c = '0.86 0.89 0.89 RG 0.4 w\n'; for (let x = p; x < L - 1; x += p) c += `${n2(x)} 0 m ${n2(x)} ${n2(A)} l S\n`; for (let y = A - p; y > 1; y -= p) c += `0 ${n2(y)} m ${n2(L)} ${n2(y)} l S\n`; }
  const ogg = [];
  ogg[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  ogg[2] = `<< /Type /Pages /Count ${pagine} /Kids [${Array.from({ length: pagine }, (_, i) => `${4 + i} 0 R`).join(' ')}] >>`;
  ogg[3] = `<< /Length ${c.length} >>\nstream\n${c}endstream`;
  for (let i = 0; i < pagine; i++) ogg[4 + i] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n2(L)} ${n2(A)}] /Resources << >> /Contents 3 0 R >>`;
  const d = new Date(), z = v => String(v).padStart(2, '0');
  const info = ogg.length;
  ogg[info] = `<< /Producer (plico) /CreationDate (D:${d.getUTCFullYear()}${z(d.getUTCMonth() + 1)}${z(d.getUTCDate())}${z(d.getUTCHours())}${z(d.getUTCMinutes())}${z(d.getUTCSeconds())}Z) >>`;
  let out = '%PDF-1.7\n%\xE2\xE3\xCF\xD3\n'; const pos = [];
  for (let i = 1; i < ogg.length; i++) { pos[i] = out.length; out += `${i} 0 obj\n${ogg[i]}\nendobj\n`; }
  const xref = out.length;
  out += `xref\n0 ${ogg.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < ogg.length; i++) out += String(pos[i]).padStart(10, '0') + ' 00000 n \n';
  out += `trailer\n<< /Size ${ogg.length} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const b = new Uint8Array(out.length); for (let i = 0; i < out.length; i++) b[i] = out.charCodeAt(i) & 255;   // solo caratteri a un byte
  return b;
}
```
<!-- fine:src/41-vuoto.js -->

### A4. Copia di sicurezza in .zip

<!-- inizio:src/42-zip.js -->
```js
// Riferimento: copia di sicurezza in formato .zip senza librerie (scrittura senza compressione, lettura anche di zip compressi).
const TAB = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = TAB[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

export async function creaZip(voci) {            // voci: [{ nome: 'Documenti/a.pdf', dati: Uint8Array | Blob }] -> Blob
  const enc = new TextEncoder(), parti = [], indice = [];
  let pos = 0;
  for (const v of voci) {
    const nome = enc.encode(v.nome);
    const blob = v.dati instanceof Blob ? v.dati : new Blob([v.dati]);
    const crc = crc32(new Uint8Array(await blob.arrayBuffer()));
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true);   // 0x0800: nomi in UTF-8
    h.setUint16(12, 0x21, true);                                                                  // data fissa 01/01/1980
    h.setUint32(14, crc, true); h.setUint32(18, blob.size, true); h.setUint32(22, blob.size, true); h.setUint16(26, nome.length, true);
    parti.push(h.buffer, nome, blob);
    indice.push({ nome, crc, lung: blob.size, pos });
    pos += 30 + nome.length + blob.size;
  }
  const inizio = pos;
  for (const e of indice) {
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(14, 0x21, true);
    c.setUint32(16, e.crc, true); c.setUint32(20, e.lung, true); c.setUint32(24, e.lung, true); c.setUint16(28, e.nome.length, true); c.setUint32(42, e.pos, true);
    parti.push(c.buffer, e.nome); pos += 46 + e.nome.length;
  }
  const f = new DataView(new ArrayBuffer(22));
  f.setUint32(0, 0x06054b50, true); f.setUint16(8, indice.length, true); f.setUint16(10, indice.length, true); f.setUint32(12, pos - inizio, true); f.setUint32(16, inizio, true);
  parti.push(f.buffer);
  return new Blob(parti, { type: 'application/zip' });
}

export async function leggiZip(file) {           // file: Blob -> [{ nome, leggi(): Promise<Uint8Array> }]
  const coda = new Uint8Array(await file.slice(Math.max(0, file.size - 65557)).arrayBuffer());
  let i = coda.length - 22;
  while (i >= 0 && !(coda[i] === 0x50 && coda[i + 1] === 0x4b && coda[i + 2] === 5 && coda[i + 3] === 6)) i--;
  if (i < 0) throw new Error('Non è un file zip');
  const dv = new DataView(coda.buffer, coda.byteOffset, coda.byteLength);
  const quante = dv.getUint16(i + 10, true), lung = dv.getUint32(i + 12, true), inizio = dv.getUint32(i + 16, true);
  const dir = new Uint8Array(await file.slice(inizio, inizio + lung).arrayBuffer());
  const dd = new DataView(dir.buffer), dec = new TextDecoder(), voci = [];
  for (let p = 0, k = 0; k < quante && dd.getUint32(p, true) === 0x02014b50; k++) {
    const metodo = dd.getUint16(p + 10, true), compresso = dd.getUint32(p + 20, true), nl = dd.getUint16(p + 28, true), el = dd.getUint16(p + 30, true), cl = dd.getUint16(p + 32, true), dove = dd.getUint32(p + 42, true);
    const nome = dec.decode(dir.subarray(p + 46, p + 46 + nl));
    if (!nome.endsWith('/')) voci.push({ nome, async leggi() {
      const h = new DataView(await file.slice(dove, dove + 30).arrayBuffer());
      const da = dove + 30 + h.getUint16(26, true) + h.getUint16(28, true);
      const grezzo = file.slice(da, da + compresso);
      if (metodo === 0) return new Uint8Array(await grezzo.arrayBuffer());
      if (metodo === 8) return new Uint8Array(await new Response(grezzo.stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
      throw new Error('Compressione non supportata: ' + nome);
    } });
    p += 46 + nl + el + cl;
  }
  return voci;
}
```
<!-- fine:src/42-zip.js -->

### A5. Costruzione

<!-- inizio:build.mjs -->
```js
// build.mjs - unisce i sorgenti di src/ in un solo index.html. Uso: node build.mjs
// Regole per i sorgenti: moduli ES con nome numerato (20-base.js, 30-archivio.js, ...); un modulo importa solo
// da moduli con numero più basso, con la forma  import { a, b } from './NN-nome.js';  ed esporta con
// export function / export async function / export const / export class.
import fs from 'node:fs';
const SRC = 'src';
const versione = JSON.parse(fs.readFileSync(`${SRC}/versione.json`, 'utf8')).versione;
const file = fs.readdirSync(SRC).sort();

// 1. stile: tutti i .css in ordine, con i font incorporati
let css = file.filter(f => f.endsWith('.css')).map(f => fs.readFileSync(`${SRC}/${f}`, 'utf8')).join('\n');
css = css.replace(/url\((['"]?)(font\/[^'")]+\.woff2)\1\)/g, (_, __, p) => `url(data:font/woff2;base64,${fs.readFileSync(`${SRC}/${p}`).toString('base64')})`);

// 2. codice: ogni modulo diventa una funzione che restituisce ciò che esporta
const moduli = file.filter(f => f.endsWith('.js'));
let js = 'const __m = {};\n';
for (const f of moduli) {
  let t = fs.readFileSync(`${SRC}/${f}`, 'utf8');
  const nomi = [];
  t = t.replace(/^import\s*\{([^}]+)\}\s*from\s*['"]\.\/([^'"]+)['"];?[ \t]*$/gm, (_, lista, da) => {
    if (!moduli.includes(da) || da >= f) throw new Error(`${f}: può importare solo da moduli con numero più basso (trovato ${da})`);
    return `const {${lista.replace(/\s+as\s+/g, ': ')}} = __m[${JSON.stringify(da)}];`;
  });
  if (/^import[\s{]/m.test(t)) throw new Error(`${f}: import non riconosciuto. Usa: import { a, b } from './NN-nome.js';`);
  t = t.replace(/^export\s+(async\s+function\*?|function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/gm, (_, tipo, nome) => { nomi.push(nome); return `${tipo} ${nome}`; });
  if (/^export\s/m.test(t)) throw new Error(`${f}: export non riconosciuto. Usa: export function / const / class Nome`);
  js += `\n// ---- ${f} ----\n__m[${JSON.stringify(f)}] = await (async () => {\n${t}\nreturn { ${nomi.join(', ')} };\n})();\n`;
}
if (/<\/script/i.test(js)) throw new Error('Il codice contiene "</script": spezza la stringa in due');

// 3. guscio: stile e codice entrano nella pagina, il service worker riceve la versione
let html = fs.readFileSync(`${SRC}/00-guscio.html`, 'utf8');
for (const segno of ['<!--STILE-->', '<!--CODICE-->']) if (!html.includes(segno)) throw new Error(`Nel guscio manca ${segno}`);
html = html.replace('<!--STILE-->', () => `<style>\n${css}\n</style>`).replace('<!--CODICE-->', () => `<script type="module">\n${js}\n</script>`).replaceAll('{{VERSIONE}}', versione);
fs.writeFileSync('index.html', html);
fs.writeFileSync('sw.js', fs.readFileSync(`${SRC}/servizio/sw.js`, 'utf8').replaceAll('{{VERSIONE}}', versione));
console.log(`plico ${versione} - index.html ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB, ${moduli.length} moduli`);
```
<!-- fine:build.mjs -->

### A6. Marchio provvisorio

<!-- inizio:icone/plico.svg -->
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="plico">
  <rect width="64" height="64" rx="14" fill="#0E1D2A"/>
  <path d="M21 11h15l10 10v30a2 2 0 0 1-2 2H21a2 2 0 0 1-2-2V13a2 2 0 0 1 2-2z" fill="#E9EDEC"/>
  <path d="M36 11v8a2 2 0 0 0 2 2h8z" fill="#CAD2D2"/>
  <path d="M24 41c3-7 6-7 7-1s3 7 6 0 4-5 6-2" fill="none" stroke="#C99A4E" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```
<!-- fine:icone/plico.svg -->

### A7. Testo della Guida

- **A cosa serve**: plico apre i tuoi PDF, te li fa leggere e ti lascia scriverci sopra a mano. I documenti restano su questo dispositivo.
- **Come funziona**: importa un PDF con il +. Tocca un documento per leggerlo. Tocca Scrivi per usare penna, evidenziatore e gomma; tocca Leggi per tornare alla lettura. Con una penna, come la S Pen, la penna scrive e il dito scorre. Ogni segno si salva da solo.
- **Opzioni**: tocca di nuovo lo strumento attivo per cambiare colore e spessore. Tieni ferma la penna a fine tratto per avere una linea dritta. Nelle Impostazioni scegli il tema e il lato della barra.
- **Esempio**: ti arriva un modulo. Condividi > plico, firmi, poi Condividi per rimandarlo. Chi lo riceve vede la firma con qualsiasi lettore PDF.
- **Attenzione**: i documenti vivono nel browser di questo dispositivo: se cancelli i dati del sito o disinstalli l'app, li perdi. Esporta ogni tanto una copia di sicurezza dalle Impostazioni. Su iPhone il sistema può svuotare l'archivio dopo un lungo periodo senza uso. plico non modifica il testo dei PDF e non apre file Word, Excel o PowerPoint: esportali in PDF dall'app che li ha creati.
