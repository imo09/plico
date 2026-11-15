# Memoria: Office in PDF

Copia della sezione O di `plico-progetto-2.0.md`, per riprendere il convertitore se servirà.

Il convertitore funzionava ma pesa quasi 17 MB: esce dall'app, resta nell'etichetta `v1.0-prova-tecnica` e questa memoria basta a riprenderlo.

- **Cosa c'era**: office2pdf 0.8.1 compilato in WebAssembly (contiene Typst 0.15 e i suoi font), compresso con gzip e diviso in due parti da 12,00 MB e 4,93 MB per il limite di 15 MB per file dell'anteprima in chat.
- **Come funzionava**: un worker (`lib/o2p/worker.js`) scarica le parti, le riunisce, le decomprime con `DecompressionStream` e crea un `Office2PdfConverter`. Due comandi: `fonts` registra i font compatibili; `convert` riceve byte e formato (docx, xlsx, pptx) e risponde con PDF, tempi e avvisi.
- **Font compatibili**: Carlito per Calibri, Caladea per Cambria, Liberation Sans e Serif per Arial e Times; 16 file, 5,95 MB.
- **Avvisi gestiti**: `fallback-used`, `unsupported-element`, `partial-element`, `parse-skipped`.
- **Provato con**: 9 documenti pubblici dell'archivio di prova di Apache POI (3 Word, 3 Excel, 3 PowerPoint).
- **Alternativa a costo zero**: Word, Excel, PowerPoint e Google Documenti su Android esportano già in PDF; con "Condividi > plico" il PDF entra in libreria.
- **Come riprenderlo**: `git checkout v1.0-prova-tecnica -- lib/o2p fonts`, poi un modulo facoltativo scaricato solo al primo uso e fuori dalla memoria principale del service worker.
