import httpx
import asyncio

async def run():
    async with httpx.AsyncClient() as c:
        try:
            res = await c.patch('http://127.0.0.1:8000/api/records/5915af39-18ef-4db8-9c08-3e449eb16e78', json={
                'file_url': 'test',
                'file_fingerprint': 'test',
                'ipfs_cid': 'test',
                'encryption_iv': 'test'
            })
            with open("test_out.txt", "w") as f:
                f.write(str(res.status_code) + "\n" + res.text)
        except Exception as e:
            with open("test_out.txt", "w") as f:
                f.write(str(e))
asyncio.run(run())
