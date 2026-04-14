import fs from "fs";
import path from "path";

function resolveDeltaTestEnvelope(input) {
    if (input && typeof input === "object" && input.user && input.date) {
        const userKey = String(input.user || "anonymous");
        const timestampKey = String(input.date || new Date().toISOString());
        return {
            userKey,
            timestampKey,
            value: input,
        };
    }

    const userKey = Object.keys(input || {})[0];
    const timestampsBucket = userKey ? input[userKey] : null;
    const timestampKey = timestampsBucket && typeof timestampsBucket === "object" ? Object.keys(timestampsBucket)[0] : "";

    if (!userKey || !timestampKey) {
        throw new Error("Invalid delta test payload");
    }

    return {
        userKey,
        timestampKey,
        value: timestampsBucket[timestampKey],
    };
}

export default function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method not allowed" });
    }

    try {
        const newData = req.body;
        const filePath = path.join(process.cwd(), "data", "DeltaTest.json");
        const dirPath = path.join(process.cwd(), "data");

        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath);
        }

        let existingData = {};
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, "utf8").trim();
            if (fileContent) {
                try {
                    existingData = JSON.parse(fileContent);
                    if (typeof existingData !== "object" || existingData === null) {
                        existingData = {};
                    }
                } catch (parseError) {
                    console.error("Error parsing existing data, initializing new object:", parseError);
                    existingData = {};
                }
            }
        }

        const { userKey, timestampKey, value } = resolveDeltaTestEnvelope(newData);
        if (!existingData[userKey]) {
            existingData[userKey] = {};
        }

        existingData[userKey][timestampKey] = value;
        fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error saving Delta test:", error);
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}
