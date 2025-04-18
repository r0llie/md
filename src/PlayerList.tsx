import { useEffect, useState } from 'react';
import './players.css';

type Player = {
  name: string;
  ping: number;
};

const TAGS = ['forza', 'montreal', 'inverse', 'lucies', 'ravens', 'compton', 'espada', 'twistenz', 'ratés', 'peres', 'zenty', 'lunatic', 'rates' ,'resiva', 'sativa', '1786', 'kaines', 'pdmd'];

function turkishToLower(str: string) {
  // Türkçe karakterler ve I/İ için normalize et
  return str
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i') // Burada 'ı' yerine 'i' yapıyoruz, çünkü taglerde 'i' kullanılıyor
    .replace(/Ş/g, 'ş')
    .replace(/Ğ/g, 'ğ')
    .replace(/Ü/g, 'ü')
    .replace(/Ö/g, 'ö')
    .replace(/Ç/g, 'ç')
    .replace(/Â/g, 'â')
    .replace(/Ê/g, 'ê')
    .replace(/Î/g, 'î')
    .replace(/Ô/g, 'ô')
    .replace(/Û/g, 'û')
    .toLowerCase();
}

function classifyPlayers(players: Player[]): Record<string, Player[]> {
  const groups: Record<string, Player[]> = {};
  players.forEach((player: Player) => {
    const name = turkishToLower(player.name);
    const matchedTag = TAGS.find(tag => name.includes(turkishToLower(tag)));
    const groupKey = matchedTag ?? 'zz_untagged';
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(player);
  });
  return groups;
}

export default function PlayerList() {
  const [playersByTag, setPlayersByTag] = useState<Record<string, Player[]>>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch("https://servers-frontend.fivem.net/api/servers/single/jxdlkm")
      .then(res => res.json())
      .then(data => {
        const players: Player[] = data?.Data?.players || [];
        const grouped = classifyPlayers(players);
        setPlayersByTag(grouped);
        setLoading(false);
      })
      .catch(() => alert("Veri çekilemedi."));
  }, []);

  const sortedKeys = Object.keys(playersByTag).sort(); // zz_untagged en sona düşer

  return (
    <div className="container">
      <h1>FiveM Oyuncu Grupları</h1>
      {loading ? (
        <p>Yükleniyor...</p>
      ) : (
        sortedKeys.map((tag: string) => (
          <div key={tag} className="tag-group">
            <h2>
              {tag.replace('zz_', '').toUpperCase()} ({playersByTag[tag].length})
            </h2>
            <ul>
              {playersByTag[tag]
                .slice(0, 5) // Sadece ilk 5 oyuncu
                .map((p: Player, idx: number) => (
                  <li key={idx}>
                    {p.name} <span className="ping">({p.ping} ms)</span>
                  </li>
                ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
