export default async function handler(req, res) {
    if (req.method !== "DELETE") {
        return res.status(405).json({ success: false, error: "Method Not Allowed" });
    }

    try {
        const { team_id } = req.query;

        const response = await fetch(`https://api.rosdk.ru/teams/delete_team/${team_id}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
        });

        const data = await response.json();

        if (response.ok) {
            res.status(200).json({ success: true, data });
        } else {
            res.status(response.status).json({ success: false, error: data.message || data.detail || "Something went wrong", details: data });
        }
    } catch (error) {
        console.error("API route error:", error);
        res.status(500).json({ success: false, error: error.message || "Internal Server Error", details: error });
    }
}

