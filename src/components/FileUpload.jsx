import { useRef, useState } from "react";
import { parseCsvFile } from "../lib/csvParser";

/**
 * FileUpload doesn't hold the parsed data itself — it parses the file
 * and reports the result up to App via onParsed/onError. App owns the
 * "what CSV is loaded" state, since that's what the rest of the page
 * needs to render off of ("lifting state up").
 */
function FileUpload({ onParsed, onError }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [fileName, setFileName] = useState(null);

  async function handleFile(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      onError?.(
        `"${file.name}" isn't a CSV file. Please choose a .csv export.`,
        file
      );
      return;
    }
    setFileName(file.name);
    setIsParsing(true);
    try {
      const result = await parseCsvFile(file);
      onParsed?.(result, file);
    } catch (err) {
      onError?.(err.message ?? "Could not parse this file.", file);
    } finally {
      setIsParsing(false);
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFile(e.dataTransfer.files?.[0]);
      }}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-16 text-center transition-colors ${
        isDragging
          ? "border-accent bg-accent-soft"
          : "border-border/40 bg-surface hover:border-border/70"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <p className="text-base font-medium text-ink">
        {isParsing
          ? `Parsing ${fileName}…`
          : "Drop a CSV here, or click to browse"}
      </p>
      <p className="mt-1 text-sm text-ink-muted">
        Nothing leaves your browser during parsing.
      </p>
    </div>
  );
}

export default FileUpload;
