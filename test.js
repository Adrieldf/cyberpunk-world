const { createCanvas } = require('canvas')
const { geoTransform, geoPath } = require('d3-geo')
const fs = require('fs')

const geoData = JSON.parse(fs.readFileSync('./public/world.geo.json'))

const width = 1024
const height = 512
const canvas = createCanvas(width, height)
const context = canvas.getContext('2d')

const projection = geoTransform({
  point: function(x, y) {
    this.stream.point(
      (x + 180) * (width / 360),
      (90 - y) * (height / 180)
    );
  }
});

const pathGenerator = geoPath(projection, context)

context.clearRect(0, 0, width, height)
context.fillStyle = '#060f18'
context.beginPath()
pathGenerator(geoData)
context.fill()

fs.writeFileSync('out.png', canvas.toBuffer())
console.log('Done')
