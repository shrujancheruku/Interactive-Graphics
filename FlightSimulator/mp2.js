
var gl;
var canvas;
var shaderProgram;
var vertexPositionBuffer;

// Create a place to store terrain geometry
var tVertexPositionBuffer;

//Create a place to store normals for shading
var tVertexNormalBuffer;

// Create a place to store the terrain triangles
var tIndexTriBuffer;

//Create a place to store the traingle edges
var tIndexEdgeBuffer;

// View parameters
var eyePt = vec3.fromValues(0.0,0.0,0.0);
var viewDir = vec3.fromValues(0.0,0.0,-1.0);

var dir_base = vec3.fromValues(0.0,0.0,-0.5);          ///setting up a base direction for view

var up = vec3.fromValues(0.0,1.0,0.0);

var up_base = vec3.fromValues(0.0,0.5,0.0);            ///setting up a base direction for up

var viewPt = vec3.fromValues(0.0,0.0,0.0);

// Create the normal
var nMatrix = mat3.create();

var my_quat = quat.create();            ///creating my quaternion
// Create ModelView matrix
var mvMatrix = mat4.create();

//Create Projection matrix
var pMatrix = mat4.create();

var mvMatrixStack = [];

// pressed keys
var keysDown = {};

//initializing the corner edges of entire map to random z values as a starting point.
function init_z_edges(vertexArray, n, scale)
{
  vertexArray[0+2] = Math.random()*scale;
  vertexArray[3*(n-1)+2] = Math.random()*scale;
  vertexArray[3*(n*n - n) + 2]= Math.random()*scale;
  vertexArray[3*(n*n - 1) + 2] = Math.random()*scale;
}
//--------------------------------------------------------------------------

//implementing the diamond square algorithm recursively to set the height of random points on map
function diamondsquare(bottom_left, bottom_right, top_left, top_right, vertexArray, scale, n)
{
  if(bottom_left+1 == bottom_right || top_left+1 == top_right || bottom_left + n == top_left || bottom_right + n == top_right)
    return;

  console.log(bottom_left);
  console.log(bottom_right);
  console.log(top_left);
  console.log(top_right);

  var middle = (bottom_left+bottom_right+top_right+top_left)/4;
  var cen_left = (bottom_left + top_left)/2;
  var cen_right = (bottom_right + top_right)/2;
  var cen_top = (top_left + top_right) / 2;
  var cen_bottom = (bottom_left + bottom_right) / 2;

  vertexArray[3*middle + 2] = (vertexArray[3*bottom_left + 2] + vertexArray[3*(bottom_right-1) + 2] + vertexArray[3*top_left + 2] + vertexArray[3*(top_right-1) + 2])/4 + Math.random()*scale;
  vertexArray[3*cen_left + 2] = (vertexArray[3*bottom_left + 2] + vertexArray[3*top_left + 2]) / 2 + Math.random()*scale;
  vertexArray[3*cen_right + 2] = (vertexArray[3*(bottom_right-1) + 2] + vertexArray[3*(top_right-1) + 2]) / 2 + Math.random()*scale;
  vertexArray[3*cen_top + 2] = (vertexArray[3*(top_right-1) + 2] + vertexArray[3*top_left + 2])/2 + Math.random()*scale;
  vertexArray[3*cen_bottom + 2] = (vertexArray[3*(bottom_right-1) + 2] + vertexArray[3*bottom_left + 2])/2 + Math.random()*scale;

  diamondsquare(cen_left, middle, top_left, cen_top, vertexArray, scale, n);
  diamondsquare(bottom_left, cen_bottom, cen_left, middle, vertexArray, scale, n);
  diamondsquare(cen_bottom, bottom_right, middle, cen_right, vertexArray, scale, n);
  diamondsquare(middle, cen_right, cen_top, top_right, vertexArray, scale, n);
}

//-------------------------------------------------------------------------
function terrainFromIteration(n, minX,maxX,minY,maxY, vertexArray, faceArray,normalArray)
{
    var deltaX=(maxX-minX)/n;
    var deltaY=(maxY-minY)/n;
    var scale = 0.13;
    for(var i=0;i<=n;i++)
       for(var j=0;j<=n;j++)
       {
           vertexArray.push(minX+deltaX*j);
           vertexArray.push(minY+deltaY*i);
           vertexArray.push(0);

           normalArray.push(0);
           normalArray.push(0);
           normalArray.push(1);
       }

    init_z_edges(vertexArray, n, scale);
    //done twice for mapping
    for(var k = 0; k < 2; k++)
    {
      diamondsquare(0, n, n*n - n, n*n, vertexArray, scale, n);
    }

    var numT=0;
    for(var i=0;i<n;i++)
       for(var j=0;j<n;j++)
       {
           var vid = i*(n+1) + j;
           faceArray.push(vid);
           faceArray.push(vid+1);
           faceArray.push(vid+n+1);

           faceArray.push(vid+1);
           faceArray.push(vid+1+n+1);
           faceArray.push(vid+n+1);
           numT+=2;
       }
    return numT;
}
//-------------------------------------------------------------------------
function generateLinesFromIndexedTriangles(faceArray,lineArray)
{
    numTris=faceArray.length/3;
    for(var f=0;f<numTris;f++)
    {
        var fid=f*3;
        lineArray.push(faceArray[fid]);
        lineArray.push(faceArray[fid+1]);

        lineArray.push(faceArray[fid+1]);
        lineArray.push(faceArray[fid+2]);

        lineArray.push(faceArray[fid+2]);
        lineArray.push(faceArray[fid]);
    }
}
//setting up terrain buffers using square diamond algorithm
//-------------------------------------------------------------------------
function setupTerrainBuffers() {

    var vTerrain=[];
    var fTerrain=[];
    var nTerrain=[];
    var eTerrain=[];
    var gridN = 64;

    var numT = terrainFromIteration(gridN, -1,1,-1,1, vTerrain, fTerrain, nTerrain);
    console.log("Generated ", numT, " triangles");
    tVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vTerrain), gl.STATIC_DRAW);
    tVertexPositionBuffer.itemSize = 3;
    tVertexPositionBuffer.numItems = (gridN+1)*(gridN+1);

    // Specify normals to be able to do lighting calculations
    tVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(nTerrain),
                  gl.STATIC_DRAW);
    tVertexNormalBuffer.itemSize = 3;
    tVertexNormalBuffer.numItems = (gridN+1)*(gridN+1);

    // Specify faces of the terrain
    tIndexTriBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexTriBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(fTerrain),
                  gl.STATIC_DRAW);
    tIndexTriBuffer.itemSize = 1;
    tIndexTriBuffer.numItems = numT*3;

    //Setup Edges
     generateLinesFromIndexedTriangles(fTerrain,eTerrain);
     tIndexEdgeBuffer = gl.createBuffer();
     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexEdgeBuffer);
     gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(eTerrain),
                  gl.STATIC_DRAW);
     tIndexEdgeBuffer.itemSize = 1;
     tIndexEdgeBuffer.numItems = eTerrain.length;


}

//drawing the terrain
//-------------------------------------------------------------------------
function drawTerrain(){
 gl.polygonOffset(0,0);
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, tVertexPositionBuffer.itemSize,
                         gl.FLOAT, false, 0, 0);

 // Bind normal buffer
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute,
                           tVertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);

 //Draw
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexTriBuffer);
 gl.drawElements(gl.TRIANGLES, tIndexTriBuffer.numItems, gl.UNSIGNED_SHORT,0);
}


//drawing the edges for the terrain
//-------------------------------------------------------------------------
function drawTerrainEdges(){
 gl.polygonOffset(10,10);
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, tVertexPositionBuffer.itemSize,
                         gl.FLOAT, false, 0, 0);

 // Bind normal buffer
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute,
                           tVertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);

 //Draw
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexEdgeBuffer);
 gl.drawElements(gl.LINES, tIndexEdgeBuffer.numItems, gl.UNSIGNED_SHORT,0);
}

//-------------------------------------------------------------------------
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//-------------------------------------------------------------------------
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform,
                      false, pMatrix);
}

//-------------------------------------------------------------------------
function uploadNormalMatrixToShader() {
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

//helpers to push and pop from matrix.
//----------------------------------------------------------------------------------
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}


//----------------------------------------------------------------------------------
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

//----------------------------------------------------------------------------------
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

//----------------------------------------------------------------------------------
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}


//creating a context and throwing error if fails
//----------------------------------------------------------------------------------
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}


//----------------------------------------------------------------------------------
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);

  // If we don't find an element with the specified id
  // we do an early exit
  if (!shaderScript) {
    return null;
  }

  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }

  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }

  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}


//setting up shaders for the vertices, perspective and lighting
//----------------------------------------------------------------------------------
function setupShaders() {
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");

  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
}


//-------------------------------------------------------------------------
function uploadLightsToShader(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

//----------------------------------------------------------------------------------
function setupBuffers() {
    setupTerrainBuffers();
}


//handler for key input: left arrow for roll left, right arrow for roll right, a for pitch left,
//d for pitch right, up arrow for yaw up, down arrow for yaw down.
//--------------------------------------------------------------------------------
function handlerforKeys(key) {
  switch(key)
  {
    case 37: rollLeft();        //left arrow key
              break;
    case 38: pitchUp();         //up arrow key
              break;
    case 39: rollRight();       //right arrow key
              break;
    case 40: pitchDown();       //down arrow key
              break;
    case 65: yawLeft();         //'a' key
              break;
    case 68: yawRight();        //'d' key
              break;

  }
}

//putting everything together and drawing on the screen
//----------------------------------------------------------------------------------
function draw() {
    var transformVec = vec3.create();

    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective
    mat4.perspective(pMatrix,degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);

    vec3.transformQuat(viewDir, dir_base, my_quat);
    vec3.transformQuat(up, up_base, my_quat);

    // We want to look down -z, so create a lookat point in that direction
    vec3.add(viewPt, eyePt, viewDir);

    // Then generate the lookat matrix and initialize the MV matrix to that view
    mat4.lookAt(mvMatrix,eyePt,viewPt,up);

    //Draw Terrain
    mvPushMatrix();
    vec3.set(transformVec,0.0,-0.25,-3.0);
    mat4.translate(mvMatrix, mvMatrix,transformVec);
    mat4.rotateX(mvMatrix, mvMatrix, degToRad(-75));
    mat4.rotateZ(mvMatrix, mvMatrix, degToRad(25));
    setMatrixUniforms();

      uploadLightsToShader([0,0,1.0],[0.8,0.7,0.6],[1.0,1.0,1.0],[1.0,1.0,1.0]);
      drawTerrain();

      uploadLightsToShader([0,1,1],[0.0,0.0,0.0],[0.0,0.0,0.0],[0.0,0.0,0.0]);
      drawTerrainEdges();


    mvPopMatrix();

}

//adding animation by moving camera in direction of movement
//----------------------------------------------------------------------------------
function animate() {
  var movement = vec3.create();
  vec3.scale(movement, viewDir, 0.0025);
  vec3.add(eyePt, eyePt, movement);

	var zRot = 0;
	var yRot = 0;
	var xRot = 0;
	// handle keys here
	if(keysDown[87]) {
		// W, rotate in the negative direction about the x axis
		xRot += elapsed * turnSpeed;
	}

	if(keysDown[83]) {
		// S, rotate in the positive direction about the x axis
		xRot -= elapsed * turnSpeed;
	}

	if(keysDown[65]) {
		// A, rotate left
		yRot -= elapsed * turnSpeed;
	}

	if(keysDown[68]) {
		// D, rotate right
		yRot += elapsed * turnSpeed;
	}

	if(keysDown[81]) {
		// Q, rotate in the negative direction about the z axis
		zRot -= elapsed * turnSpeed;
	}

	if(keysDown[69]) {
		// E, rotate in the positive direction about the z axis
		zRot += elapsed * turnSpeed;
	}

	var a = mat4.create();
	var b = mat4.create();
	var c = mat4.create();
	mat4.copy(c, mvMatrix);

	//rotate that shit
	mat4.rotateZ(a, mat4.create(), degToRad(zRot));
	mat4.rotateY(b, a, degToRad(yRot));
	mat4.rotateX(a, b, degToRad(xRot));

	//translate that shit
	mat4.translate(b, a, [0, 0, elapsed * airSpeed]);
	mat4.multiply(mvMatrix, b, c);
}

//----------------------------------------------------------------------------------
function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShaders();
  setupBuffers();
  gl.clearColor(0.6, 0.9, 0.9, 1.0);
  gl.enable(gl.DEPTH_TEST);
  //getting key pressed by user
  document.addEventListener('keydown', function(event) {
    handlerforKeys(event.keyCode);
  });
  tick();
}

//----------------------------------------------------------------------------------
function tick() {
    requestAnimFrame(tick);
    draw();
    animate();
}

//changes viewdir to an angle towards the left.
//-----------------------------------------------------------------
function rollLeft() {
    var temp = quat.create();
    quat.setAxisAngle(temp, viewDir, -degToRad(0.9));
    quat.normalize(temp, temp);
    quat.multiply(my_quat, temp, my_quat);
    quat.normalize(my_quat, my_quat);
}

//changes viewdir to an angle towards the right
//---------------------------------------------------------------------
function rollRight()
{
    var temp = quat.create();
    quat.setAxisAngle(temp, viewDir, degToRad(0.9));
    quat.normalize(temp, temp);
    quat.multiply(my_quat, temp, my_quat);
    quat.normalize(my_quat, my_quat);
}

//changes up by an angle to the left
//----------------------------------------------------------------------
function yawLeft()
{
  var temp = quat.create();
  quat.setAxisAngle(temp, up, degToRad(0.9));
  quat.normalize(temp, temp);
  quat.multiply(my_quat, temp, my_quat);
  quat.normalize(my_quat, my_quat);
}

//changes up by an angle to the right
//-------------------------------------------------------------------
function yawRight()
{
  var temp = quat.create();
  quat.setAxisAngle(temp, up, -degToRad(0.9));
  quat.normalize(temp, temp);
  quat.multiply(my_quat, temp, my_quat);
  quat.normalize(my_quat, my_quat);
}

//changes viewdir by an angle upwards using crossproduct
//---------------------------------------------------------------------
function pitchUp()
{
  var temp = quat.create();
  var temp2 = vec3.create();
  vec3.cross(temp2, viewDir, up);
  quat.setAxisAngle(temp, temp2, degToRad(0.9));
  quat.normalize(temp, temp);
  quat.multiply(my_quat, temp, my_quat);
  quat.normalize(my_quat, my_quat);
}


//changes viewdir by an angle downwards using crossproduct
//------------------------------------------------------------------------
function pitchDown()
{
  var temp = quat.create();
  var temp2 = vec3.create();
  vec3.cross(temp2, viewDir, up);
  quat.setAxisAngle(temp, temp2, -degToRad(0.9));
  quat.normalize(temp, temp);
  quat.multiply(my_quat, temp, my_quat);
  quat.normalize(my_quat, my_quat);

}
