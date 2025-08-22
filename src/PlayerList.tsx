import { useEffect, useState, useCallback, useMemo } from 'react';
import './players.css';

type PlayerIdentifier = string;

type Player = {
  name: string;
  ping: number;
  id: number;
  identifiers: PlayerIdentifier[];
  endpoint: string;
};

// Ekip kısaltmaları ve ilişkileri
interface TeamMapping {
  name: string;       // Ekibin tam adı
  aliases: string[];  // Kısaltmalar veya alternatif isimler
  displayName: string; // Görüntülenecek isim
}

// Ekip eşleştirmelerini tanımla
const TEAM_MAPPINGS: TeamMapping[] = [
  { name: 'montreal', aliases: ['mtl'], displayName: 'MONTREAL' },
  { name: 'shakers', aliases: ['shk'], displayName: 'SHAKERS' },
  { name: 'pdmd', aliases: ['pd'], displayName: 'PDMD' },
  { name: 'inverse', aliases: ['inv'], displayName: 'INVERSE' },
  { name: 'lucies', aliases: ['lcs'], displayName: 'LUCIES' },
  { name: 'forza', aliases: ['frz'], displayName: 'FORZA' },
  { name: 'ravens', aliases: ['rvn'], displayName: 'RAVENS' },
  { name: 'compton', aliases: ['cmp'], displayName: 'COMPTON' },
  { name: 'espada', aliases: ['esp'], displayName: 'ESPADA' },
  { name: 'lunatic', aliases: ['lntc'], displayName: 'LUNATIC' },
  { name: 'twistenz', aliases: ['twz'], displayName: 'TWISTENZ' },
  { name: 'rates', aliases: ['ratés', 'rt'], displayName: 'RATES' },
  { name: 'peres', aliases: ['prs'], displayName: 'PERES' },
  { name: 'zenty', aliases: ['znt'], displayName: 'ZENTY' },
  { name: 'resiva', aliases: ['rsv'], displayName: 'RESIVA' },
  { name: 'sativa', aliases: ['stv'], displayName: 'SATIVA' },
  { name: 'noir', aliases: ['nr', 'teamnoir'], displayName: 'NOIR' },
  { name: 'oblock', aliases: ['oblk'], displayName: 'OBLOCK' },
  { name: 'sivil', aliases: ['svl'], displayName: 'SIVIL' },
  { name: 'outlawz', aliases: ['otlwz'], displayName: 'OUTLAWZ' },
  { name: 'exline', aliases: ['exl'], displayName: 'EXLINE' },
  { name: 'encore', aliases: ['enc'], displayName: 'ENCORE' },
  { name: '74', aliases: [], displayName: '74' },
  { name: 'nmd', aliases: [], displayName: 'NMD' },
  { name: '606', aliases: [], displayName: '606' },
  { name: 'ews', aliases: [], displayName: 'EWS' },
  { name: 'ext', aliases: [], displayName: 'EXT' },
  { name: 'sd', aliases: [], displayName: 'SD' },
  { name: 'never', aliases: [], displayName: 'NEVER' },
  { name: 'expert', aliases: [], displayName: 'EXPERT' },
  { name: 'costra', aliases: [], displayName: 'COSTRA' },
  { name: '1786', aliases: [], displayName: '1786' },
  { name: 'kaines', aliases: [], displayName: 'KAINES' }
];

// Character mapping for Turkish and special characters
const charMap: Record<string, string> = {
  'İ': 'i', 'I': 'i', 'ı': 'i',
  'Ş': 's', 'ş': 's',
  'Ğ': 'g', 'ğ': 'g',
  'Ü': 'u', 'ü': 'u',
  'Ö': 'o', 'ö': 'o',
  'Ç': 'c', 'ç': 'c',
  'Â': 'a', 'â': 'a',
  'Ê': 'e', 'ê': 'e', 'é': 'e',
  'Î': 'i', 'î': 'i',
  'Ô': 'o', 'ô': 'o',
  'Û': 'u', 'û': 'u'
};

function normalizeText(str: string): string {
  return str.split('').map(char => charMap[char] || char.toLowerCase()).join('');
}

// Oyuncu adından ekip bulma
function findTeamFromPlayerName(name: string): TeamMapping | null {
  const normalizedName = normalizeText(name);
  
  // İsmin içinde ana ekip ismi veya kısaltma var mı kontrol et
  for (const team of TEAM_MAPPINGS) {
    // Ana ekip ismi kontrolü
    if (normalizedName.includes(normalizeText(team.name))) {
      return team;
    }
    
    // Kısaltma kontrolü
    for (const alias of team.aliases) {
      if (normalizedName.includes(normalizeText(alias))) {
        return team;
      }
    }
    
    // Kelime bazında kontrol
    const words = normalizedName.split(' ');
    if (words.some(word => 
      word === normalizeText(team.name) || 
      team.aliases.some(alias => word === normalizeText(alias))
    )) {
      return team;
    }
  }
  
  return null;
}

function classifyPlayers(players: Player[]): Record<string, Player[]> {
  const groups: Record<string, Player[]> = {};
  
  players.forEach((player: Player) => {
    const name = player.name;
    
    // Oyuncunun adından ekip bul
    const team = findTeamFromPlayerName(name);
    
    // Eğer ekip bulunduysa, onun adını kullan; bulunamadıysa "tagsiz" grubuna ekle
    const groupKey = team ? team.name : 'zz_untagged';
    
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(player);
  });
  
  return groups;
}

export default function PlayerList() {
  const [playersByTag, setPlayersByTag] = useState<Record<string, Player[]>>({});
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [playersOnline, setPlayersOnline] = useState<number>(0);
  const [teamsCount, setTeamsCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch player data
  useEffect(() => {
    setLoading(true);
    fetch("https://servers-frontend.fivem.net/api/servers/single/9vom8e")
      .then(res => {
        if (!res.ok) {
          throw new Error("Sunucudan veri alınamadı.");
        }
        return res.json();
      })
      .then(data => {
        const players: Player[] = data?.Data?.players || [];
        const grouped = classifyPlayers(players);
        setPlayersByTag(grouped);
        setAllPlayers(players);
        setPlayersOnline(players.length);
        
        // Count real teams (excluding untagged)
        const teamCount = Object.keys(grouped).filter(tag => tag !== 'zz_untagged').length;
        setTeamsCount(teamCount);
        
        // Initialize with tag that has most players
        const tagsWithPlayers = Object.keys(grouped)
          .sort((a, b) => grouped[b].length - grouped[a].length);
        
        if (tagsWithPlayers.length > 0) {
          setActiveCategory(tagsWithPlayers[0]);
        }
        
        setLoading(false);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || "Veri çekilemedi.");
        setLoading(false);
      });
  }, []);
  
  // Filter players based on search query - memoized to prevent unnecessary recalculations
  const filteredPlayers = useMemo(() => {
    const normalizedQuery = normalizeText(searchQuery.trim());
    if (normalizedQuery === '') return allPlayers;
    
    return allPlayers.filter(player => 
      normalizeText(player.name).includes(normalizedQuery) ||
      player.id.toString().includes(normalizedQuery)
    );
  }, [searchQuery, allPlayers]);
  
  // Get the group for search results or use original grouping - memoized
  const displayGroups = useMemo(() => {
    return searchQuery.trim() === '' 
      ? playersByTag 
      : classifyPlayers(filteredPlayers);
  }, [searchQuery, playersByTag, filteredPlayers]);
  
  // Get all tags sorted by player count
  const getSortedTags = useCallback(() => {
    return Object.keys(displayGroups)
      .filter(tag => displayGroups[tag]?.length > 0)
      .sort((a, b) => {
        // Untagged at the end
        if (a === 'zz_untagged') return 1;
        if (b === 'zz_untagged') return -1;
        // Sort by player count
        return (displayGroups[b]?.length || 0) - (displayGroups[a]?.length || 0);
      });
  }, [displayGroups]);

  // Set active tag
  const setActiveTag = useCallback((tag: string) => {
    setActiveCategory(tag);
  }, []);

  // Format identifier for display
  const formatIdentifier = useCallback((identifier: string) => {
    const [type, value] = identifier.split(':');
    return (
      <div className="identifier">
        <span className="identifier-type">{type}:</span>
        <span className="identifier-value">{value}</span>
      </div>
    );
  }, []);

  // Format team name for display
  const formatTeamName = useCallback((tag: string) => {
    if (tag === 'zz_untagged') return 'TAGSIZ';
    
    // Ekip varsa ekibin görüntülenecek adını getir
    const team = TEAM_MAPPINGS.find(t => t.name === tag);
    if (team) {
      return team.displayName;
    }
    
    // Format team names for better display
    return tag.toUpperCase();
  }, []);

  // Handle player selection
  const handlePlayerSelect = useCallback((player: Player) => {
    setSelectedPlayer(player);
  }, []);

  // Handle modal close
  const handleCloseModal = useCallback(() => {
    setSelectedPlayer(null);
  }, []);

  const visibleTags = useMemo(() => getSortedTags(), [getSortedTags]);

  return (
    <div className="player-container">
      <header className="page-header">
        <h1>FiveM Oyuncu Takip Paneli</h1>
        <div className="stats-bar">
          <div className="stat-item">
            <span className="stat-value">{playersOnline}</span>
            <span className="stat-label">Aktif Oyuncu</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{teamsCount}</span>
            <span className="stat-label">Toplam Ekip</span>
          </div>
        </div>
      </header>
      
      <div className="search-container">
        <input
          type="text"
          placeholder="Oyuncu ismi, ID veya tag ile ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        {searchQuery && (
          <div className="search-results-count">
            <span className="result-highlight">{filteredPlayers.length}</span> oyuncu bulundu
          </div>
        )}
      </div>
      
      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <div>Sunucu verisi yükleniyor...</div>
        </div>
      ) : error ? (
        <div className="loading error">
          <div>⚠️ {error}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="retry-button"
          >
            Tekrar Dene
          </button>
        </div>
      ) : (
        <div className="main-content">          
          <div className="tags-header">
            {visibleTags.map((tag) => (
              <div 
                key={tag} 
                className={`tag-header ${activeCategory === tag ? 'active' : ''}`}
                onClick={() => setActiveTag(tag)}
              >
                <span className="tag-name">
                  {formatTeamName(tag)}
                </span>
                <span className="tag-count">{displayGroups[tag]?.length || 0}</span>
              </div>
            ))}
          </div>
          
          <div className="content-area">
            {activeCategory && displayGroups[activeCategory] && (
              <div className="player-panel">
                <div className="panel-title">
                  <h3>
                    {formatTeamName(activeCategory)} 
                    <span className="team-total">({displayGroups[activeCategory].length} oyuncu)</span>
                  </h3>
                </div>
                <ul className="player-list">
                  {displayGroups[activeCategory].map((player) => (
                    <li 
                      key={player.id}
                      className="player-item"
                      onClick={() => handlePlayerSelect(player)}
                    >
                      <div className="player-name">{player.name}</div>
                      <div className="player-ping">{player.ping} ms</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {activeCategory && (!displayGroups[activeCategory] || displayGroups[activeCategory].length === 0) && (
              <div className="empty-state">
                <p>Bu kategoride oyuncu bulunamadı.</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {selectedPlayer && (
        <div className="player-modal-overlay" onClick={handleCloseModal}>
          <div className="player-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={handleCloseModal}>×</button>
            <h3>{selectedPlayer.name}</h3>
            <div className="player-details">
              <div className="detail-item">
                <span className="detail-label">ID:</span>
                <span className="detail-value">{selectedPlayer.id}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Ping:</span>
                <span className="detail-value">{selectedPlayer.ping} ms</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Endpoint:</span>
                <span className="detail-value">{selectedPlayer.endpoint}</span>
              </div>
            </div>
            <div className="player-identifiers">
              <h4>Identifiers</h4>
              {selectedPlayer.identifiers.map((id, index) => (
                <div key={index} className="identifier-item">
                  {formatIdentifier(id)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

