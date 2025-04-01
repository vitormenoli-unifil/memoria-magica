import React, { useEffect, useState } from 'react';

function Scoreboard() {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchScores() {
      try {
        const res = await fetch('http://localhost:3001/api/scores');
        const data = await res.json();
        setScores(data);
      } catch (error) {
        console.error('Erro ao carregar ranking:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchScores();
  }, []);
  
  if (loading) {
    return <p>Carregando ranking...</p>;
  }
  
  if (scores.length === 0) {
    return <p>Nenhuma pontuação registrada ainda.</p>;
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="table-auto w-full text-left">
        <thead>
          <tr className="bg-gray-200">
            <th className="px-4 py-2">Posição</th>
            <th className="px-4 py-2">Jogador</th>
            <th className="px-4 py-2">Pontuação</th>
            <th className="px-4 py-2">Tempo (s)</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((entry, index) => (
            <tr key={entry.id || index} className="border-b">
              <td className="px-4 py-2">{index + 1}</td>
              <td className="px-4 py-2">{entry.name}</td>
              <td className="px-4 py-2">{entry.score}</td>
              <td className="px-4 py-2">{entry.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Scoreboard;