import asyncio
import httpx

async def test_resolve():
    async with httpx.AsyncClient(timeout=60.0) as client:
        # 1. Resolve a Saavn track (clean metadata)
        payload = {
            "title": "Shiddat (Female Version)",
            "artist": "Yohani, Manan Bhardwaj",
            "duration": 0
        }
        print(f"Resolving: {payload['title']} by {payload['artist']}")
        response = await client.post("http://127.0.0.1:8000/resolve/", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            print("Success! Resolved to:")
            print(f"Title: {data['title']}")
            print(f"URL: {data['url'][:50]}...")
            print(f"Duration: {data['duration']}ms")
        else:
            print(f"Failed! Status: {response.status_code}")
            print(f"Body: {response.text}")

if __name__ == "__main__":
    asyncio.run(test_resolve())
