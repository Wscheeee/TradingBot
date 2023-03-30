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
  