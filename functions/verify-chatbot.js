const fs = require('fs');

async function verify() {
    // Clear file first
    try {
        fs.writeFileSync('verify_output.txt', '');
    } catch (e) {
    }
    const log = (msg) => {
        console.log(msg); // Also log to console for visibility
        try {
            fs.appendFileSync('verify_output.txt', msg + '\n');
        } catch (e) {
            // ignore
        }
    };

    log("Starting verification...");

    try {
        // Check if fetch is available
        if (typeof fetch === 'undefined') {
            log("Error: fetch is not defined (Node version to old?)");
            return;
        }

        const response = await fetch("https://afhtz3nj.us-west.insforge.app/functions/medical-chatbot", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjAxMDB9.AZ9I-lrOczyty3Hx9bPiyD-ggXjl3X6BezXoKIWeVNQ"
            },
            body: JSON.stringify({
                patient_wallet: "0x1111111111111111111111111111111111111111",
                message: "Hello"
            })
        });

        const status = response.status;
        const text = await response.text();

        log(`Status: ${status}`);
        log(`Body: ${text}`);

    } catch (err) {
        log(`Error: ${err.message}`);
        if (err.cause) log(`Cause: ${err.cause}`);
    }
}
verify();
