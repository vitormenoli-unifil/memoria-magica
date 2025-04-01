import React, { useState, useRef, useEffect } from 'react';
import Scoreboard from './components/Scoreboard';
import Card from './components/Card';

function App() {
  const [cards, setCards] = useState([]);
  const [firstIndex, setFirstIndex] = useState(null);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showRanking, setShowRanking] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [scoreSaved, setScoreSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  const symbols = ['🐶', '🐱', '🦊', '🐼', '🐵', '🐸', '🐰', '🦁'];
  
  function shuffleArray(array) {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function initializeGame() {
    const deckSymbols = shuffleArray([...symbols, ...symbols]);

    const initialCards = deckSymbols.map((symbol, index) => ({
      id: index,
      value: symbol,
      isFlipped: false,
      isMatched: false
    }));

    setCards(initialCards);
    setFirstIndex(null);
    setMoves(0);
    setMatchedPairs(0);
    setGameOver(false);
    setScoreSaved(false);
    setPlayerName('');
    setTimeElapsed(0);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);
  }
  
  function startGame() {
    setGameStarted(true);
    initializeGame();
  }
  
  function restartGame() {
    initializeGame();
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);
  
  function handleCardClick(index) {
    if (busy || gameOver) return;

    if (firstIndex === null) {
      if (cards[index].isMatched || cards[index].isFlipped) return;

      setFirstIndex(index);
      setCards(prevCards => 
        prevCards.map((card, i) => i === index ? { ...card, isFlipped: true } : card)
      );

    } else {
      if (index === firstIndex || cards[index].isMatched || cards[index].isFlipped) return;
      const firstIdx = firstIndex;
      const secondIdx = index;

      setCards(prevCards => 
        prevCards.map((card, i) => i === secondIdx ? { ...card, isFlipped: true } : card)
      );
      setMoves(prev => prev + 1);
      setBusy(true);
      setFirstIndex(null);

      if (cards[firstIdx].value === cards[secondIdx].value) {
        setCards(prevCards => prevCards.map((card, i) => {
          if (i === firstIdx || i === secondIdx) {
            return { ...card, isMatched: true };
          }
          return card;
        }));

        setMatchedPairs(prev => {
          const newMatched = prev + 1;
          if (newMatched * 2 === cards.length) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
            const totalSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
            setTimeElapsed(totalSeconds);
            setGameOver(true);
          }
          return newMatched;
        });
        setBusy(false);
      } else {
        setTimeout(() => {
          setCards(prevCards => prevCards.map((card, i) => {
            if (i === firstIdx || i === secondIdx) {
              return { ...card, isFlipped: false };
            }
            return card;
          }));
          setBusy(false);
        }, 1000);
      }
    }
  }

  async function handleSaveScore() {
    if (!playerName || scoreSaved) return;
    const score = calculateScore();
    try {
      const response = await fetch('http://localhost:3001/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: playerName, score: score, time: timeElapsed })
      });
      if (response.ok) {
        setScoreSaved(true);
        setShowRanking(true);
      } else {
        console.error('Falha ao salvar pontuação');
      }
    } catch (error) {
      console.error('Erro ao conectar ao servidor:', error);
    }
  }

  function calculateScore() {
    const totalPairs = cards.length / 2;
    const timePenalty = timeElapsed * 10;
    const movesPenalty = (moves - totalPairs) * 100;
    let rawScore = 10000 - timePenalty - movesPenalty;
    if (rawScore < 0) rawScore = 0;
    return Math.floor(rawScore);
  }

  if (showRanking) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <h2 className="text-2xl font-bold mb-4 text-center">Ranking de Jogadores</h2>
        <Scoreboard />
        <div className="text-center mt-4">
          <button onClick={() => setShowRanking(false)} className="px-4 py-2 bg-blue-500 text-white rounded">
            {gameOver ? 'Voltar' : 'Voltar ao Jogo'}
          </button>
        </div>
      </div>
    );
  }

  if (!gameStarted) {
    return (
      <div className="text-center p-8 flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-4">Memória Mágica</h1>
        <img src="/logo.png" alt="Logo" className='mb-4' />
        <button onClick={startGame} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded">
          Iniciar Jogo
        </button>
        <div className="mt-4">
          <button onClick={() => setShowRanking(true)} className="underline text-blue-600">
            Ver Ranking
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="text-lg">Movimentos: {moves}</div>
        <div className="text-lg">Tempo: {timeElapsed}s</div>
        <button onClick={() => setShowRanking(true)} className="text-blue-600 underline">Ranking</button>
      </div>
      <div className="grid grid-cols-4 gap-4 justify-center">
        {cards.map((card, index) => (
          <Card 
            key={card.id} 
            card={card} 
            onClick={() => handleCardClick(index)} 
          />
        ))}
      </div>
      {gameOver && (
        <div className="mt-6 text-center">
          <h2 className="text-2xl font-bold mb-2">Fim de Jogo!</h2>
          <p className="mb-4">Você concluiu com {moves} movimentos em {timeElapsed} segundos.</p>
          {!scoreSaved && (
            <div className="mb-4">
              <input 
                type="text" 
                placeholder="Seu nome" 
                className="border p-2 mr-2"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
              />
              <button onClick={handleSaveScore} className="px-4 py-2 bg-green-600 text-white rounded">
                Salvar Pontuação
              </button>
            </div>
          )}
          {scoreSaved && <p className="mb-4 text-green-600">Pontuação salva!</p>}
          <button onClick={restartGame} className="px-4 py-2 bg-blue-600 text-white rounded">
            Jogar Novamente
          </button>
        </div>
      )}
    </div>
  );
}

export default App;