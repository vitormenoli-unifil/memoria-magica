import React from 'react';

function Card({ card, onClick }) {
  const { isFlipped, isMatched, value } = card;
  let classes = "w-16 h-16 sm:w-20 sm:h-20 rounded-md shadow-md flex items-center justify-center text-2xl font-bold ";
  if (isFlipped || isMatched) {
    classes += "bg-white ";
    if (isMatched) {
      classes += "text-gray-400 cursor-default ";
    } else {
      classes += "text-black cursor-pointer ";
    }
  } else {
    classes += "bg-indigo-600 text-white cursor-pointer ";
  }
  
  return (
    <div className={classes} onClick={onClick}>
      { (isFlipped || isMatched) ? value : '?' }
    </div>
  );
}

export default Card;
