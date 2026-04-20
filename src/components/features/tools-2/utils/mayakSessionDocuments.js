import { pdf } from "@react-pdf/renderer";
import QRCode from "qrcode";

import Certificate, { buildCertificateDateText } from "../Certificate";
import SessionLogs from "../SessionLogs";

export async function buildMayakQrDataUrl(userId, baseUrl) {
    const origin = baseUrl || (typeof window !== "undefined" ? window.location.origin : "");
    const qrUrl = `${origin}/results?id=${encodeURIComponent(userId || "")}`;
    return QRCode.toDataURL(qrUrl, { width: 200, margin: 1 });
}

export async function buildMayakCertificateBlob({ userName, dateStr, qrDataUrl, certificateNumber }) {
    return pdf(<Certificate userName={userName} date={dateStr} qrDataUrl={qrDataUrl} certificateNumber={certificateNumber} />).toBlob();
}

export async function buildMayakSessionLogBlob({ userName, userRole, dateStr, totalTime, rankingData, tasks }) {
    return pdf(<SessionLogs userName={userName} userRole={userRole} date={dateStr} totalTime={totalTime} rankingData={rankingData} tasks={tasks} />).toBlob();
}

export function downloadMayakBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
