function Shape(name) {
  this.name = name;
}
Shape.prototype.describe = function () {
  return this.name + " with area " + this.area().toFixed(2);
};

function Circle(r) {
  // your code here
}
