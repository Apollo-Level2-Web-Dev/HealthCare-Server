{
  function filterEvenNumbers(numberArray: number[]): number[] {
    const evenNumbers = numberArray.filter(numbers => numbers % 2 === 0);
    return evenNumbers;
  }
  const numberArray = [1, 2, 3, 4, 5, 6];
  const evenNumbers = filterEvenNumbers(numberArray);
  console.log(evenNumbers);
}
