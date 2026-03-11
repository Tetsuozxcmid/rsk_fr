import {
    clearMayakAdminCookie,
    isMayakAdminAuthenticated,
    setMayakAdminCookie,
    validateMayakAdminPassword,
} from "../../../lib/mayakAdminAuth.js";

export default async function handler(req, res) {
    if (req.method === "GET") {
        return res.status(200).json({ success: true, authenticated: isMayakAdminAuthenticated(req) });
    }

    if (req.method === "POST") {
        const password = req.body?.password || "";
        const check = validateMayakAdminPassword(password);
        if (!check.ok) {
            return res.status(check.status).json({ success: false, error: check.error });
        }
        setMayakAdminCookie(res);
        return res.status(200).json({ success: true });
    }

    if (req.method === "DELETE") {
        clearMayakAdminCookie(res);
        return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: "Method not allowed" });
}
