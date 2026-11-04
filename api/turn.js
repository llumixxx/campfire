// Cloudflare TURN 임시 자격증명 발급 (Vercel 서버리스 함수)
// Vercel 환경변수 TURN_KEY_ID, TURN_KEY_API_TOKEN 이 없으면 빈 목록을 돌려줘서 그냥 P2P로만 동작해요.
export default async function handler(req, res) {
  const id = process.env.TURN_KEY_ID, token = process.env.TURN_KEY_API_TOKEN;
  if (!id || !token) { res.status(200).json({ iceServers: [] }); return; }
  try {
    const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${id}/credentials/generate-ice-servers`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ttl: 86400 })
    });
    const j = await r.json();
    let list = j.iceServers;
    if (!Array.isArray(list)) list = list ? [list] : [];
    list = list.map(s => ({ ...s, urls: (Array.isArray(s.urls) ? s.urls : [s.urls]).filter(u => !/:53(\?|$)/.test(u)) }))
               .filter(s => s.urls.length);
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=600");
    res.status(200).json({ iceServers: list });
  } catch (e) {
    res.status(200).json({ iceServers: [] });
  }
}
