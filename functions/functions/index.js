
// GCS + CSV parser
const { Storage } = require("@google-cloud/storage");
const { parse } = require("csv-parse");
// index.js (v2, limpio)

// 1) Imports v2
const { setGlobalOptions } = require("firebase-functions/v2");
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onObjectFinalized } = require("firebase-functions/v2/storage");
const logger = require("firebase-functions/logger");

// 2) Admin SDK
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

// 3) Opciones globales (aplican a v2)
setGlobalOptions({
  maxInstances: 10,
  region: "us-central1", // ajusta si usas otra región
});

// 4) HTTP function (v2)
exports.addmessage = onRequest(async (req, res) => {
  try {
    const original = (req.query.text ?? req.body?.text ?? "").toString();
    if (!original) {
      res.status(400).json({ error: "Missing 'text' param" });
      return;
    }
    const writeResult = await db.collection("messages").add({ original });
    logger.info("Message added", { id: writeResult.id, original });
    res.json({ result: `Message with ID: ${writeResult.id} added.` });
  } catch (err) {
    logger.error("addmessage failed", err);
    res.status(500).json({ error: "Internal error" });
  }
});

// 5) Firestore trigger (v2)
exports.makeuppercase = onDocumentCreated("messages/{documentId}", async (event) => {
  const snap = event.data;
  const original = snap.data().original ?? "";
  logger.log("Uppercasing", { id: event.params.documentId, original });
  const uppercase = original.toUpperCase();
  await snap.ref.set({ uppercase }, { merge: true });
});


const storage = new Storage();

/**
 * Se dispara cuando se FINALIZA (sube correctamente) un objeto en Storage.
 * - Filtra CSVs por contentType o extensión
 * - Lee por streaming
 * - Loguea encabezados y primeras 10 filas
 */
exports.processCsvOnUpload = onObjectFinalized(async (event) => {
  const { bucket, name, contentType = "", size = "0", metadata = {}, generation } = event.data || {};

  logger.info("[INIT]", {
    bucket, name, size, contentType, generation, metadata
  });

  // Acepta text/csv, algunos navegadores suben CSV como vnd.ms-excel, y/o por extensión
  const isCsv =
    contentType.toLowerCase().includes("csv") ||
    contentType.toLowerCase() === "application/vnd.ms-excel" ||
    (name && name.toLowerCase().endsWith(".csv"));

  if (!isCsv) {
    logger.info("[SKIP] No parece CSV, omitiendo.", { contentType, name });
    return;
  }

  // (Opcional) filtrar por prefijo de carpeta, descomenta si querés limitar
  // if (!name.startsWith("imports/")) {
  //   logger.info("[SKIP] Fuera del prefijo 'imports/'", { name });
  //   return;
  // }

  const file = storage.bucket(bucket).file(name);

  // Stream → csv-parse con columns:true crea objetos {col: valor}
  const parser = parse({
    columns: true,
    trim: true,
    skip_empty_lines: true
  });

  let headersLogged = false;
  let rowCount = 0;
  const SAMPLE_LIMIT = 10;

  await new Promise((resolve, reject) => {
    file
      .createReadStream()
      .on("error", (err) => {
        logger.error("[ERROR] al leer el archivo", { err: err.message });
        reject(err);
      })
      .pipe(parser)
      .on("headers", (headers) => {
        // 'headers' solo se emite si usáramos fast-csv; en csv-parse no existe este evento.
        // Para csv-parse usamos reader.fieldnames (pero aquí no está). Usaremos la primera fila para deducir.
      })
      .on("data", (row) => {
        rowCount++;

        // La primera fila nos sirve para extraer headers (keys del objeto)
        if (!headersLogged) {
          const headers = Object.keys(row);
          logger.info(`[CSV] Encabezados (${headers.length})`, { headers });
          headersLogged = true;
        }

        if (rowCount <= SAMPLE_LIMIT) {
          logger.info(`[ROW ${rowCount}]`, row);
        }
      })
      .on("end", () => {
        logger.info("[DONE] Total filas leídas (sin contar encabezado)", { totalRows: rowCount });
        resolve();
      })
      .on("error", (err) => {
        logger.error("[ERROR] en parse CSV", { err: err.message });
        reject(err);
      });
  });
});