import path from "path";
import React from "react";
import QRCode from "qrcode";
import { renderToBuffer } from "@react-pdf/renderer";

import Certificate from "@/components/features/tools-2/Certificate";
import SessionLogs from "@/components/features/tools-2/SessionLogs";
import { generateAnalyticsBufferFromLogData } from "@/lib/analyticsGenerator";

export function formatMayakCertificateDate(dateInput = new Date()) {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
    const formatted = safeDate
        .toLocaleDateString("ru-RU", {
            year: "numeric",
            month: "long",
            day: "numeric",
        })
        .replace(/ г\.?$/, "")
        .trim();

    return `${formatted} г. - 12 академических часов`;
}

export function formatMayakHumanDate(dateInput = new Date()) {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
    return safeDate.toLocaleDateString("ru-RU");
}

export async function buildMayakQrDataUrl({ baseUrl, userId }) {
    const normalizedBaseUrl = String(baseUrl || "").replace(/\/$/, "");
    const qrUrl = `${normalizedBaseUrl}/results?id=${encodeURIComponent(String(userId || ""))}`;
    return QRCode.toDataURL(qrUrl, { width: 200, margin: 1 });
}

export async function generateMayakCertificateBuffer({ userName, qrDataUrl, completedAt }) {
    return renderToBuffer(
        <Certificate
            userName={userName}
            qrDataUrl={qrDataUrl}
            dateText={formatMayakCertificateDate(completedAt)}
            backgroundImageSrc={path.join(process.cwd(), "public", "certificat.png")}
        />
    );
}

export async function generateMayakLogBuffer({ logData }) {
    return renderToBuffer(
        <SessionLogs
            userName={logData.userName}
            userRole={logData.userRole}
            date={logData.date}
            totalTime={logData.totalTime}
            rankingData={logData.rankingData}
            tasks={logData.tasks}
        />
    );
}

export async function generateMayakAnalyticsBuffer({ logData }) {
    return generateAnalyticsBufferFromLogData(logData);
}
