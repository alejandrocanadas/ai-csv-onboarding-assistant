import Papa from "papaparse";

/**
 * Parses a CSV File into { columns, rows, rowCount, errors }.
 * Values are kept as raw strings (dynamicTyping: false) — the analysis
 * layer decides how to interpret each column, since messy exports mix
 * formats (e.g. "10%" vs "0.1") that PapaParse's auto-typing would mangle.
 */
export function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",
      dynamicTyping: false,
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        const columns = results.meta.fields ?? [];
        resolve({
          columns,
          rows: results.data,
          rowCount: results.data.length,
          errors: results.errors,
        });
      },
      error: (error) => reject(error),
    });
  });
}
