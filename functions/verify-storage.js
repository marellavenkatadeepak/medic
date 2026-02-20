const { createClient } = require('@supabase/supabase-js');

// Load env vars manually for this script since we are running locally with node
const URL = "https://afhtz3nj.us-west.insforge.app";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjAxMDB9.AZ9I-lrOczyty3Hx9bPiyD-ggXjl3X6BezXoKIWeVNQ";

const supabase = createClient(URL, KEY, {
    auth: {
        persistSession: false
    }
});

async function testStorage() {
    console.log("Testing Storage Access with ANON_KEY...");

    // 1. Try to list files
    const { data: listData, error: listError } = await supabase
        .storage
        .from('medical-reports')
        .list();

    if (listError) {
        console.error("List Error:", listError);
    } else {
        console.log("List Success. Found files:", listData.length);
        if (listData.length > 0) {
            console.log("First file:", listData[0].name);

            // 2. Try to download first file
            const { data: dlData, error: dlError } = await supabase
                .storage
                .from('medical-reports')
                .download(listData[0].name);

            if (dlError) {
                console.error("Download Error:", dlError);
            } else {
                console.log("Download Success. File size:", dlData.size);
            }
        }
    }
}

testStorage();
