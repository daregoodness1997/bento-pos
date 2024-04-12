const generateRandomHexDigitWithPrefix = (prefix: string = 'ORD'): string => {
  let hexString = '';
  for (let i = 0; i < 6; i += 1) {
    const randomNumber = Math.random();
    const hexDigit = Math.floor(randomNumber * 16);
    hexString += hexDigit.toString(16);
  }
  // Add the prefix
  return `${prefix}#${hexString}`;
};

export { generateRandomHexDigitWithPrefix };
