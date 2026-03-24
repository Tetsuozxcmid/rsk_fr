import { getMayakOnboardingConfig } from "../../../lib/mayakOnboarding.js";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: { message: "Method not allowed" } });
    }

    const config = await getMayakOnboardingConfig();
    return res.status(200).json({ config });
}
