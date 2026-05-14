import { FileText, Image as ImageIcon } from "lucide-react";
import { type RepositoryDocument } from "@/lib/records-storage";

function buildLegacyPreviewHtml(doc: RepositoryDocument): string {
  // Note: This mirrors the current legacy preview logic used in DocumentRepositoryPage.
  if (!doc.fileDataUrl) {
    return `
      <div style="height:360px;border:1px dashed #cbd5e1;border-radius:12px;display:flex;align-items:center;justify-content:center;background:#f8fafc;color:#475569;padding:20px;text-align:center;">
        File preview is unavailable for this legacy record. Upload a new version to enable native preview.
      </div>
    `;
  }

  if (doc.type === "jpg" || doc.type === "png") {
    return `
      <div style="height:360px;border:1px dashed #cbd5e1;border-radius:12px;background:#f8fafc;overflow:hidden;display:flex;align-items:center;justify-content:center;">
        <img src="${doc.fileDataUrl}" alt="${doc.name}" style="max-width:100%;max-height:100%;object-fit:contain;" />
      </div>
    `;
  }

  if (doc.type === "pdf") {
    return `
      <div style="height:70vh;border:1px dashed #cbd5e1;border-radius:12px;background:#f8fafc;overflow:hidden;">
        <iframe src="${doc.fileDataUrl}" title="${doc.name}" style="width:100%;height:100%;border:0;"></iframe>
      </div>
    `;
  }

  return `
    <div style="height:360px;border:1px dashed #cbd5e1;border-radius:12px;padding:20px;background:#f8fafc;color:#334155;line-height:1.6;">
      <p><strong>Document:</strong> ${doc.name}</p>
      <p><strong>Type:</strong> ${doc.type.toUpperCase()}</p>
      <p><strong>Policy:</strong> ${doc.policyTitle}</p>
      <p><strong>Division:</strong> ${doc.division}</p>
      <p><strong>Last Edited:</strong> ${doc.lastEdited}</p>
      <p style="margin-top:16px;color:#64748b;">Document preview metadata is shown here for non-image/non-PDF files.</p>
    </div>
  `;
}

function shouldUseNativePreview(doc: RepositoryDocument): boolean {
  return Boolean(doc.fileDataUrl) && (doc.type === "pdf" || doc.type === "jpg" || doc.type === "png");
}

export function DocumentPreview({ doc }: { doc: RepositoryDocument }) {
  if (shouldUseNativePreview(doc)) {
    return (
      <iframe
        src={doc.fileDataUrl}
        title={doc.name}
        style={{ width: "100%", height: "70vh", border: 0 }}
      />
    );
  }

  // Legacy HTML preview (client-side generated)
  const previewBody = buildLegacyPreviewHtml(doc);
  const fullHtml = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Preview - ${doc.name}</title>
        <style>
          body { font-family: Segoe UI, sans-serif; margin: 0; padding: 24px; color: #0f172a; background: #ffffff; }
          .meta { color: #475569; font-size: 14px; margin-bottom: 14px; }
          a { color: inherit; }
        </style>
      </head>
      <body>
        <h2 style="margin:0 0 6px 0;">${doc.name}</h2>
        <div class="meta">${doc.policyTitle} • ${doc.division} • v${doc.version}</div>
        ${previewBody}
      </body>
    </html>
  `;

  const previewUrl = URL.createObjectURL(
    new Blob([fullHtml], { type: "text/html;charset=utf-8" })
  );

  // Render the legacy preview by embedding the blob URL in an iframe.
  // (Consumers that want a popup can use openPreviewWithTab below.)
  return (
    <iframe
      src={previewUrl}
      title={`Preview - ${doc.name}`}
      style={{ width: "100%", height: "70vh", border: 0 }}
      onLoad={() => {
        // Let the browser start loading before revoking.
        window.setTimeout(() => URL.revokeObjectURL(previewUrl), 10000);
      }}
    />
  );
}

export function openDocumentPreviewInNewTab(doc: RepositoryDocument): void {
  if (shouldUseNativePreview(doc)) {
    const tab = window.open(doc.fileDataUrl, "_blank", "noopener,noreferrer");
    if (!tab) {
      // Popup blocked; caller can toast if desired.
    }
    return;
  }

  const previewBody = buildLegacyPreviewHtml(doc);
  const fileContent = `Document: ${doc.name}\nPolicy: ${doc.policyTitle}\nDivision: ${doc.division}\nLast Edited: ${doc.lastEdited}`;

  const previewHtml = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Preview - ${doc.name}</title>
        <style>
          body { font-family: Segoe UI, sans-serif; margin: 0; padding: 24px; color: #0f172a; background: #ffffff; }
          .toolbar { display: flex; gap: 10px; margin-bottom: 16px; }
          button { border: 1px solid #cbd5e1; background: #f8fafc; color: #0f172a; padding: 8px 14px; border-radius: 8px; cursor: pointer; }
          button:hover { background: #e2e8f0; }
          .meta { color: #475569; font-size: 14px; margin-bottom: 14px; }
        </style>
      </head>
      <body>
        <h2 style="margin:0 0 6px 0;">${doc.name}</h2>
        <div class="meta">${doc.policyTitle} • ${doc.division} • v${doc.version}</div>
        <div class="toolbar">
          <button id="downloadBtn">Download</button>
          <button id="printBtn">Print</button>
        </div>
        ${previewBody}
        <script>
          const content = ${JSON.stringify(fileContent)};
          document.getElementById('downloadBtn')?.addEventListener('click', () => {
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = ${JSON.stringify(doc.name)};
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          });
          document.getElementById('printBtn')?.addEventListener('click', () => window.print());
        </script>
      </body>
    </html>
  `;

  const previewBlob = new Blob([previewHtml], { type: "text/html;charset=utf-8" });
  const previewUrl = URL.createObjectURL(previewBlob);
  const tab = window.open(previewUrl, "_blank");
  if (!tab) {
    URL.revokeObjectURL(previewUrl);
  } else {
    window.setTimeout(() => URL.revokeObjectURL(previewUrl), 10000);
  }
}

export function DocumentPreviewFallbackIcon({ doc }: { doc: RepositoryDocument }) {
  const Icon = doc.type === "jpg" || doc.type === "png" ? ImageIcon : FileText;
  return <Icon className="h-5 w-5" />;
}
