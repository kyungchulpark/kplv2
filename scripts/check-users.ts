
import { createClient } from "@supabase/supabase-js";
import * as path from "path";
import { config } from "dotenv";

config({ path: path.join(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
    const { data: users, error } = await supabase
        .from("profiles")
        .select("is_active, is_legacy, role");

    if (error) {
        console.error("Error fetching profiles:", JSON.stringify(error, null, 2));
        return;
    }

    const total = users.length;
    const active = users.filter(u => u.is_active).length;
    const inactive = users.filter(u => !u.is_active).length;
    const legacy = users.filter(u => u.is_legacy).length;

    const result = {
        total,
        active,
        inactive,
        legacy,
        admins
    };

    const fs = require('fs');
    fs.writeFileSync('user_check_result.txt', JSON.stringify(result, null, 2));
    console.log("Written to user_check_result.txt");
}

main();
