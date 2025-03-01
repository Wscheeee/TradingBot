//@ts-check
/**
 * A class for performing arithmetic operations on decimal and number values.
 */
class DecimalMath {
    /**
     * Initializes a new instance of the DecimalMath class.
     * @param {number|string} value - The initial value to use.
     */
    constructor(value) {
        this.result = Number(value);
    }
  
    /**
     * Adds a decimal or number value to the current result.
     * @param {number|string} value - The value to add.
     * @returns {DecimalMath} The current DecimalMath instance.
     */
    add(value) {
        this.result = Number((this.result + Number(value)).toFixed(10));
        return this;
    }
  
    /**
     * Subtracts a decimal or number value from the current result.
     * @param {number|string} value - The value to subtract.
     * @returns {DecimalMath} The current DecimalMath instance.
     */
    subtract(value) {
        this.result = Number((this.result - Number(value)).toFixed(10));
        return this;
    }
  
    /**
     * Multiplies the current result by a decimal or number value.
     * @param {number|string} value - The value to multiply by.
     * @returns {DecimalMath} The current DecimalMath instance.
     */
    multiply(value) {
        this.result = Number((this.result * Number(value)).toFixed(10));
        return this;
    }
  
    /**
     * Divides the current result by a decimal or number value.
     * @param {number|string} value - The value to divide by.
     * @returns {DecimalMath} The current DecimalMath instance.
     */
    divide(value) {
        this.result = Number((this.result / Number(value)).toFixed(10));
        return this;
    }
  
    /**
     * Rounds the current result to a specified number of decimal places.
     * @param {number} decimalPlaces - The number of decimal places to round to.
     * @returns {DecimalMath} The current DecimalMath instance.
     */
    round(decimalPlaces) {
        this.result = Number(this.result.toFixed(decimalPlaces));
        return this;
    }

    /**
     * rancates a decimal number to specified decimal places 
     * @param {number} decimalPlaces 
     * @returns {DecimalMath}
     */
    truncateToDecimalPlaces(decimalPlaces) {
        const factor = Math.pow(10, decimalPlaces);
        this.result = Math.trunc(this.result * factor) / factor;
        return this;
    }

    /**
     * Return only whole number
     */
    removeDecimals() {
        this.result =  Math.floor(this.result);
        return this;
    }

    
    /**
     * Count the number of decimal places in a given number.
     */
    countDecimalPlaces() {
        const num = this.result;
        if (typeof num !== "number") {
            throw new Error("Input must be a number.");
        }
  
        // Convert the number to a string to easily find the decimal point.
        const numString = num.toString();
  
        // Check if the number contains a decimal point.
        const decimalIndex = numString.indexOf(".");
        if (decimalIndex === -1) {
            this.result =  0; // No decimal places
            return this;
        }
  
        // Calculate the number of decimal places, accounting for trailing zeroes.
        this.result =  numString.length - decimalIndex - 1;
        return this;
        
    }
  
  
    /**
     * Gets the current result of the arithmetic operations.
     * @returns {number} The current result.
     */
    getResult() {
        return this.result;
    }
}
  
module.exports.DecimalMath = DecimalMath;
// Example usage
//   const result = new DecimalMath(0.1)
//     .add(0.2)
//     .subtract(0.05)
//     .multiply(3)
//     .divide(2)
//     .round(3)
//     .getResult();
  
//   console.log(result); // Output: 0.225
  