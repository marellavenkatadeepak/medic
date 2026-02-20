// Native fetch is available in Node 18+
async function verify() {
    try {
        console.log("Testing analyze-report...");
        const response = await fetch("https://afhtz3nj.us-west.insforge.app/functions/analyze-report", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjAxMDB9.AZ9I-lrOczyty3Hx9bPiyD-ggXjl3X6BezXoKIWeVNQ"
            },
            body: JSON.stringify({
                patient_wallet: "0x1111111111111111111111111111111111111111",
                // Missing file_url/key to trigger 400 if working, or 500 if crashing
            })
        });

        const status = response.status;
        const text = await response.text();

        console.log(`Status: ${status}`);
        console.log(`Body: ${text}`);

    } catch (err) {
        console.error("Error:", err.message);
    }
}

verify();
