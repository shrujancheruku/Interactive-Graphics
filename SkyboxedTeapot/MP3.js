var gl;
var canvas;

var shaderProgram;

// Create a place to store the texture coords for the mesh
var cubeTCoordBuffer;

// Create a place to store terrain geometry
var cubeVertexBuffer;

// Create a place to store the triangles
var cubeTriIndexBuffer;

// View parameters
var eyePt = vec3.fromValues(0.0,0.0,10.0);
var viewDir = vec3.fromValues(0.0,0.0,-1.0);
var up = vec3.fromValues(0.0,1.0,0.0);
var viewPt = vec3.fromValues(0.0,0.0,0.0);
var globalQuat = quat.create();

// Create ModelView matrix
var mvMatrix = mat4.create();

// Create Projection matrix
var pMatrix = mat4.create();

// Create Normal matrix
var nMatrix = mat3.create();

var mvMatrixStack = [];

// Create a place to store the texture
var cubeImage;
var cubeTexture;

// For animation
var then =0;
var modelXRotationRadians = degToRad(0);
var modelYRotationRadians = degToRad(0);

// ready variable
ready_to_draw = false;

// Function to pass the model view matrix to the shader program
function uploadModelViewMatrixToShader() {
	gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

// Function to pass the projection matrix to the shader program
function uploadProjectionMatrixToShader() {
	gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
}

// Function to pass the normal matrix to the shader program
function uploadNormalMatrixToShader() {
    mat3.fromMat4(nMatrix,mvMatrix);
    mat3.transpose(nMatrix,nMatrix);
    mat3.invert(nMatrix,nMatrix);
    gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

// Function to manipulate lighting information in shader for Phong Lighting Model
function uploadLightsToShader(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

// Function to pass the view direction vector to the shader program
function uploadViewDirToShader(){
	gl.uniform3fv(gl.getUniformLocation(shaderProgram, "viewDir"), viewDir);
}

// Function to pass the rotation matrix to the shader program so that reflections work as the teapot spins
function uploadRotateMatrixToShader(rotateMat){
	gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uRotateMat"), false, rotateMat);
}

// Routine for pushing a current model view matrix to a stack for hieroarchial modeling
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}

// Routine for popping a stored model view matrix from stack for hieroarchial modeling
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
    	throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

// Sends projection/modelview matrices to shader
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
	uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

function degToRad(degrees) {
	return degrees * Math.PI / 180;
}

// Creates a context
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

// Loads shaders
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

// Function to pass boolean variable to shader program.
function switchShaders(isSkybox){
	gl.uniform1f(gl.getUniformLocation(shaderProgram, "uIsSkybox"), isSkybox);
}

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

	// Enable vertex position
	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
	console.log("Vertex attrib: ", shaderProgram.vertexPositionAttribute);
	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

	// Enable vertex normals
    shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
    gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

	// Enable matrix manipulations
	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");

	// Enable Phong Shading options
	shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
	shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");
	shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");
	shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
	shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
}

// Global buffers used to render teapot
var teapotVertexBuffer;
var teapotVertexNormalBuffer;
var teapotTriIndexBuffer;

// Function to parse the teapot_0.obj file and setup the vertex and tri-index buffers
function setupTeapotBuffers(raw_file_text){
	var vertices = [];
	var faces = [];
	count_vertices = 0;
	count_faces = 0;

	// read in vertex and face data
	var lines = raw_file_text.split("\n");
	for (var line_num in lines){
		list_elements = lines[line_num].split(' ');

		// line corresponds to vertex information
		if (list_elements[0] == 'v'){
			vertices.push(parseFloat(list_elements[1]));
			vertices.push(parseFloat(list_elements[2]));
			vertices.push(parseFloat(list_elements[3]));
			count_vertices += 1;
		}
		// line corresponds to face information
		else if(list_elements[0] == 'f'){
			faces.push(parseInt(list_elements[2])-1);
			faces.push(parseInt(list_elements[3])-1);
			faces.push(parseInt(list_elements[4])-1);
			count_faces += 1;
		}
	}

	// bind vertex data
	teapotVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	teapotVertexBuffer.numItems = count_vertices;

	// calculate normals
	var normals = [];
	for (var i=0; i < count_vertices; i++){
		normals.push(0);
		normals.push(0);
		normals.push(0);
	}
	// Calculate vertex normals
	calculateNormals(vertices, faces, count_faces, count_vertices, normals);

	// bind normal data
	teapotVertexNormalBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    teapotVertexNormalBuffer.itemSize = 3;
    teapotVertexNormalBuffer.numItems = count_faces;

	// bind face data
    teapotTriIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotTriIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(faces), gl.STATIC_DRAW);
	teapotTriIndexBuffer.numItems = count_faces;

	// Global indicator that teapot can now be rendered
	ready_to_draw = true;
}


// Function to set the vertex positions and vertex normals before drawing the teapot for each frame.
function drawTeapot(){
	switchShaders(false);
	uploadViewDirToShader()

	gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexNormalBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);

	// Draw the cube.
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotTriIndexBuffer);
	setMatrixUniforms();
	gl.drawElements(gl.TRIANGLES, 6768, gl.UNSIGNED_SHORT, 0);
}


// This function calculates the vertex normals
function calculateNormals(vertices, faces, numT, numV, normals){
    var faceNormals = [];

    // calculate normals for each triangle
    for (var i = 0; i < numT; i++){
        var v1 = faces[i*3];
        var v2 = faces[i*3 + 1];
        var v3 = faces[i*3 + 2];

        // compute surface normal
        var vector1 = vec3.fromValues(vertices[3*v2]-vertices[3*v1], vertices[3*v2+1]-vertices[3*v1+1], vertices[3*v2+2]-vertices[3*v1+2]);
        var vector2 = vec3.fromValues(vertices[3*v3]-vertices[3*v1], vertices[3*v3+1]-vertices[3*v1+1], vertices[3*v3+2]-vertices[3*v1+2]);
        var normal = vec3.create();
        vec3.cross(normal, vector1, vector2);

        faceNormals.push(normal[0]);
        faceNormals.push(normal[1]);
        faceNormals.push(normal[2]);
    }

    // initialize count array to all 0s
    var count = []
    for (var i = 0; i < numV; i++)
        count.push(0);

    // calculate sum of the surface normal vectors to which each vertex belongs
    for (var i = 0; i < numT; i++){
        var v1 = faces[i*3 + 0]
        var v2 = faces[i*3 + 1]
        var v3 = faces[i*3 + 2]
        // iterate over each vertex in triangle
        count[v1] += 1
        count[v2] += 1
        count[v3] += 1

        // vertex 0
        normals[3*v1 + 0] += faceNormals[i*3 + 0];
        normals[3*v1 + 1] += faceNormals[i*3 + 1];
        normals[3*v1 + 2] += faceNormals[i*3 + 2];

        // vertex 1
        normals[3*v2 + 0] += faceNormals[i*3 + 0];
        normals[3*v2 + 1] += faceNormals[i*3 + 1];
        normals[3*v2 + 2] += faceNormals[i*3 + 2];

        // vertex 2
        normals[3*v3 + 0] += faceNormals[i*3 + 0];
        normals[3*v3 + 1] += faceNormals[i*3 + 1];
        normals[3*v3 + 2] += faceNormals[i*3 + 2];
    }

    // average each normal vector in normalsNormalBuffer
    // then normalize each normal vector in normalsNormalBuffer
    for (var i = 0; i < numV; i++){
        // average out the adjacent surface normal vectors for point
        normals[3*i+0] = normals[3*i+0]/count[i];
        normals[3*i+1] = normals[3*i+1]/count[i];
        normals[3*i+2] = normals[3*i+2]/count[i];

        // normalize the normal vector
        var normal = vec3.fromValues(normals[i*3+0], normals[i*3+1], normals[i*3+2]);
        var normalized = vec3.create();
        vec3.normalize(normalized, normal);

        // store the normal vector
        normals[i*3+0] = normalized[0];
        normals[i*3+1] = normalized[1];
        normals[i*3+2] = normalized[2];
    }
}

// Function to setup the draw buffers for the teapot and skybox
function setupBuffers(){
    setupSkybox();
	readTextFile("teapot_0.obj", setupTeapotBuffers);
}


// Function to set camera location and viewing direction
function draw() {
    var translateVec = vec3.create();
    var scaleVec = vec3.create();

    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.perspective(pMatrix,degToRad(90), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);

    mvPushMatrix();
	var rotateMat = mat4.create();
	mat4.rotateY(rotateMat, rotateMat, modelYRotationRadians);
	uploadRotateMatrixToShader(rotateMat);
    vec3.set(translateVec,0.0,0.0,-10.0);
    mat4.translate(mvMatrix, mvMatrix,translateVec);
    setMatrixUniforms();

    vec3.add(viewPt, eyePt, viewDir);
    mat4.lookAt(mvMatrix,eyePt,viewPt,up);

	uploadLightsToShader([0,20,0],[0.0,0.0,0.0],[0.3,0.3,0.3],[0.3,0.3,0.3]);

    drawSkybox();
	if (ready_to_draw){
		mat4.rotateY(mvMatrix,mvMatrix,modelYRotationRadians);
		drawTeapot();
	}

	// reset mvMatrix
    mvPopMatrix();

}

// Function to setup the cubemap texture for the skybox and teapot.
function setupCubeMap() {
    // Initialize the Cube Map, and set its parameters
    cubeTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);

	// Set texture parameters
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER,
          gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER,
          gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);

    // Load up each cube map face
    loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_POSITIVE_X,
          cubeTexture, 'posx.jpg');
    loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
         cubeTexture, 'negx.jpg');
    loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
        cubeTexture, 'posy.jpg');
    loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
       cubeTexture, 'negy.jpg');
    loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
       cubeTexture, 'posz.jpg');
    loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
       cubeTexture, 'negz.jpg');
}

// Function to bind images to a specific side of the cubemap
function loadCubeMapFace(gl, target, texture, url){
    var image = new Image();
    image.onload = function()
    {
    	gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);
        gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    }
    image.src = url;
}


// Function to verify if a value is a power of 2 or not
function isPowerOf2(value) {
	return (value & (value - 1)) == 0;
}

// Function to setup the vertex and tri-index buffers for the skybox cube.
function setupSkybox() {

  // Create a buffer for the cube's vertices.
  cubeVertexBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);

  var vertices = [
    // Front
    -100.0, -100.0,  100.0,
     100.0, -100.0,  100.0,
     100.0,  100.0,  100.0,
    -100.0,  100.0,  100.0,

    // Back
    -100.0, -100.0, -100.0,
    -100.0,  100.0, -100.0,
     100.0,  100.0, -100.0,
     100.0, -100.0, -100.0,

    // Top
    -100.0,  100.0, -100.0,
    -100.0,  100.0,  100.0,
     100.0,  100.0,  100.0,
     100.0,  100.0, -100.0,

    // Bottom
    -100.0, -100.0, -100.0,
     100.0, -100.0, -100.0,
     100.0, -100.0,  100.0,
    -100.0, -100.0,  100.0,

    // Right
     100.0, -100.0, -100.0,
     100.0,  100.0, -100.0,
     100.0,  100.0,  100.0,
     100.0, -100.0,  100.0,

    // Left
    -100.0, -100.0, -100.0,
    -100.0, -100.0,  100.0,
    -100.0,  100.0,  100.0,
    -100.0,  100.0, -100.0
  ];

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  cubeTriIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);

  var cubeVertexIndices = [
    0,  1,  2,      0,  2,  3,    // front
    4,  5,  6,      4,  6,  7,    // back
    8,  9,  10,     8,  10, 11,   // top
    12, 13, 14,     12, 14, 15,   // bottom
    16, 17, 18,     16, 18, 19,   // right
    20, 21, 22,     20, 22, 23    // left
  ]

  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
}


// Function to set the vertex positions before drawing the skybox for each frame.
function drawSkybox(){
  switchShaders(true);

	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);
	gl.uniform1i(gl.getUniformLocation(shaderProgram, "uSampler"), 0);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);
	setMatrixUniforms();
	gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
}

// Function to load the image to a face of the cubemap.
function handleTextureLoaded(image, texture)
{
  console.log("handleTextureLoaded, image = " + image);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);
  if (isPowerOf2(image.width) && isPowerOf2(image.height))
	{
     gl.generateMipmap(gl.TEXTURE_2D);
     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
     console.log("Loaded power of 2 texture");
  }
	else
	{
     gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
     gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
     gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
     console.log("Loaded non-power of 2 texture");
  }
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
}

function startup() {
	canvas = document.getElementById("myGLCanvas");
	gl = createGLContext(canvas);
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.enable(gl.DEPTH_TEST);

	// set up event listener for keystrokes
	document.onkeydown = handleKeyDown;

	setupShaders();
	setupBuffers();
	setupCubeMap();

	tick();
}

function tick() {
    requestAnimFrame(tick);
    draw();
}

var origUp = vec3.fromValues(0.0, 1.0, 0.0);
var origEyePt = vec3.fromValues(0.0,0.0,10.0);

// Function which adds a new rotation around a given axis to the global quaternion
function quatRotation(rotationRate, rotAxis){
    // create a new quaternion to apply new rotation
    var tempQuat = quat.create();
    quat.setAxisAngle(tempQuat, rotAxis, rotationRate);
    quat.normalize(tempQuat, tempQuat);

    // apply new rotation to global quaternion
    quat.multiply(globalQuat, tempQuat, globalQuat);
    quat.normalize(globalQuat, globalQuat);
}

// Function to handle user input (from arrow keys)
function handleKeyDown(event){
	// left arrow key -> turn right
    if (event.keyCode == 39){
        quatRotation(-0.05, origUp);

    vec3.transformQuat(eyePt, origEyePt, globalQuat);
		vec3.normalize(viewDir, eyePt);
		vec3.scale(viewDir, viewDir, -1);
    }
    // right arrow key -> turn left
    else if (event.keyCode == 37){
        quatRotation(0.05, origUp);

    vec3.transformQuat(eyePt, origEyePt, globalQuat);
		vec3.normalize(viewDir, eyePt);
		vec3.scale(viewDir, viewDir, -1);
    }
	// a -> turn teapot left
	else if (event.keyCode == 65){
		modelYRotationRadians += 0.05;
	}
	// d -> turn teapot right
	else if (event.keyCode == 68){
		modelYRotationRadians -= 0.05;
	}
}
