window.MATHPAD_PROBLEMS = []
  .concat(window.MATHPAD_LIMITS || [])
  .concat(window.MATHPAD_CONTINUITY || [])
  .concat(window.MATHPAD_RATE_DERIVATIVE || [])
  .concat(window.MATHPAD_APPLICATION || [])
  .sort((a,b) => {
    const unitOrder = {"극한":1,"연속":2,"변화율":3,"미분":4,"도함수 활용":5};
    return (unitOrder[a.unit]||99)-(unitOrder[b.unit]||99)
      || a.difficulty-b.difficulty
      || a.id-b.id;
  });
