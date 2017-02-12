var gl;
var canvas;
var shaderProgram;
var vertex1PositionBuffer;
var vertex2PositionBuffer;


var vertex1ColorBuffer;
var vertex2ColorBuffer;

var mvMatrix = mat4.create();
var pMatrix = mat4.create();
var rotAngle = 0;
var sinscalar = 0;

//set matrices within the scope of the shaders
function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
}

//converts degrees to radians
function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

//create canvas
function createGLContext(canvas) {
    var names = ["webgl", "experimental-webgl"];
    var context = null;
    for (var i = 0; i < names.length; i++) {
        try {
            context = canvas.getContext(names[i]);
        } catch (e) {}
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

//load shaders
function loadShaderFromDOM(id) {
    var shaderScript = document.getElementById(id);

    if (!shaderScript) {
        return null;
    }

    var shaderSource = "";
    var currentChild = shaderScript.firstChild;
    while (currentChild) {
        if (currentChild.nodeType == 3) {
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

//setting up the shaders
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

    shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
    gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);

}

//setting up shape and color vertices using arrays
function setupBuffers() {
    vertex1PositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertex1PositionBuffer);
    var topVertices = [-1.00, 1.00, 0.0,
        0.00, 1.00, 0.0, -1.00, 0.6, 0.0,
        0.00, 1.00, 0.0, -1.00, 0.6, 0.0,
        0.0, 0.6, 0.0, -0.8, 0.6, 0.0, -0.36, 0.6, 0.0, -0.8, 0.36, 0.0, -0.36, 0.6, 0.0, -0.8, 0.36, 0.0, -0.36, 0.36, 0.0, -0.8, 0.36, 0.0, -0.2, 0.36, 0.0, -0.8, -0.07, 0.0, -0.2, 0.36, 0.0, -0.8, -0.07, 0.0, -0.2, -0.07, 0.0, -0.8, -0.07, 0.0, -0.36, -0.07, 0.0, -0.8, -0.33, 0.0, -0.36, -0.07, 0.0, -0.8, -0.33, 0.0, -0.36, -0.33, 0.0,
        1.00, 1.00, 0.0, -0.00, 1.00, 0.0,
        1.00, 0.6, 0.0,
        0.00, 1.00, 0.0,
        1.00, 0.6, 0.0,
        0.0, 0.6, 0.0,
        0.8, 0.6, 0.0,
        0.36, 0.6, 0.0,
        0.8, 0.36, 0.0,
        0.36, 0.6, 0.0,
        0.8, 0.36, 0.0,
        0.36, 0.36, 0.0,
        0.8, 0.36, 0.0,
        0.2, 0.36, 0.0,
        0.8, -0.07, 0.0,
        0.2, 0.36, 0.0,
        0.8, -0.07, 0.0,
        0.2, -0.07, 0.0,
        0.8, -0.07, 0.0,
        0.36, -0.07, 0.0,
        0.8, -0.33, 0.0,
        0.36, -0.07, 0.0,
        0.8, -0.33, 0.0,
        0.36, -0.33, 0.0,
    ];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(topVertices), gl.STATIC_DRAW);
    vertex1PositionBuffer.itemSize = 3;
    vertex1PositionBuffer.numberOfItems = 48;

    vertex2PositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertex2PositionBuffer);
    var bottomVertices = [
        -0.8,  -0.4,  0.0,
        -0.63, -0.4,  0.0,
        -0.8,  -0.57, 0.0,
        -0.63, -0.4,  0.0,
        -0.8,  -0.57, 0.0,
        -0.63, -0.57, 0.0,
        -0.8,  -0.57, 0.0,
        -0.63, -0.57, 0.0,
        -0.63, -0.63, 0.0,
        -0.5,  -0.4,  0.0,
        -0.5,  -0.66, 0.0,
        -0.33, -0.4,  0.0,
        -0.5,  -0.66, 0.0,
        -0.33, -0.4,  0.0,
        -0.33, -0.66, 0.0,
        -0.5,  -0.66, 0.0,
        -0.33, -0.66, 0.0,
        -0.33, -0.72, 0.0,
        -0.23, -0.4,  0.0,
        -0.06, -0.4,  0.0,
        -0.23, -0.75, 0.0,
        -0.06, -0.4,  0.0,
        -0.23, -0.75, 0.0,
        -0.06, -0.75, 0.0,
        -0.23, -0.75, 0.0,
        -0.06, -0.75, 0.0,
        -0.06, -0.80, 0.0,
         0.8,  -0.4,  0.0,
         0.63, -0.4,  0.0,
         0.8,  -0.57, 0.0,
         0.63, -0.4,  0.0,
         0.8,  -0.57, 0.0,
         0.63, -0.57, 0.0,
         0.8,  -0.57, 0.0,
         0.63, -0.57, 0.0,
         0.63, -0.63, 0.0,
         0.5,  -0.4,  0.0,
         0.5,  -0.66, 0.0,
         0.33, -0.4,  0.0,
         0.5,  -0.66, 0.0,
         0.33, -0.4,  0.0,
         0.33, -0.66, 0.0,
         0.5,  -0.66, 0.0,
         0.33, -0.66, 0.0,
         0.33, -0.72, 0.0,
         0.23, -0.4,  0.0,
         0.06, -0.4,  0.0,
         0.23, -0.75, 0.0,
         0.06, -0.4,  0.0,
         0.23, -0.75, 0.0,
         0.06, -0.75, 0.0,
         0.23, -0.75, 0.0,
         0.06, -0.75, 0.0,
         0.06, -0.80, 0.0,
    ];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bottomVertices), gl.STATIC_DRAW);
    vertex2PositionBuffer.itemSize = 3;
    vertex2PositionBuffer.numberOfItems = 54;

    vertex1ColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertex1ColorBuffer);
    var color1 = [
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,
        0.075, 0.157, 0.294, 1.0,

    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(color1), gl.STATIC_DRAW);
    vertex1ColorBuffer.itemSize = 4;
    vertex1ColorBuffer.numItems = 48;

    vertex2ColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertex2ColorBuffer);
    var color2 = [

        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
        0.643, 0.205, 0.152, 1.0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(color2), gl.STATIC_DRAW);
    vertex2ColorBuffer.itemSize = 4;
    vertex2ColorBuffer.numItems = 54;

}

//initialize display and draw matrices
function draw() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT);
    mat4.identity(mvMatrix);

    mat4.rotateY(mvMatrix, mvMatrix, degToRad(rotAngle));

    gl.bindBuffer(gl.ARRAY_BUFFER, vertex1PositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute,
        vertex1PositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertex1ColorBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexColorAttribute,
        vertex1ColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

    setMatrixUniforms();
    gl.drawArrays(gl.TRIANGLES, 0, vertex1PositionBuffer.numberOfItems);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertex2PositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute,
        vertex2PositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertex2ColorBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexColorAttribute,
        vertex2ColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

    setMatrixUniforms();
    gl.drawArrays(gl.TRIANGLES, 0, vertex2PositionBuffer.numberOfItems);


}

//runs all the functions in order
function startup() {
    canvas = document.getElementById("myGLCanvas");
    gl = createGLContext(canvas);
    setupShaders();
    setupBuffers();
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    tick();
}

//Keeps animations running
function tick() {
    requestAnimFrame(tick);
    draw();
    animate();
}

//animates the image
function animate() {

        rotAngle= (rotAngle+0.5) % 360;

        sinscalar += 0.01;
        gl.bindBuffer(gl.ARRAY_BUFFER, vertex2PositionBuffer);
        var bottomVertices = [
            -0.8 + Math.sin(sinscalar-0.25)*0.3,  -0.4 + Math.cos(sinscalar*3)*0.05,  0.0,
            -0.63 + Math.sin(sinscalar-0.25)*0.3, -0.4 + Math.cos(sinscalar*3)*0.05,  0.0,
            -0.8 + Math.sin(sinscalar-0.25)*0.3,  -0.57 + Math.cos(sinscalar*3)*0.05, 0.0,
            -0.63 + Math.sin(sinscalar-0.25)*0.3, -0.4 + Math.cos(sinscalar*3)*0.05,  0.0,
            -0.8 + Math.sin(sinscalar-0.25)*0.3,  -0.57 + Math.cos(sinscalar*3)*0.05, 0.0,
            -0.63 + Math.sin(sinscalar-0.25)*0.3, -0.57 + Math.cos(sinscalar*3)*0.05, 0.0,
            -0.8 + Math.sin(sinscalar-0.25)*0.3,  -0.57 + Math.cos(sinscalar*3)*0.05, 0.0,
            -0.63 + Math.sin(sinscalar-0.25)*0.3, -0.57 + Math.cos(sinscalar*3)*0.05, 0.0,
            -0.63 + Math.sin(sinscalar-0.25)*0.3, -0.63 + Math.cos(sinscalar*3)*0.05, 0.0,
            -0.5 + Math.sin(sinscalar-0.25)*0.2, -0.4 + Math.cos(sinscalar*3)*0.05,  0.0,
            -0.5 + Math.sin(sinscalar-0.25)*0.2, -0.66 + Math.cos(sinscalar*3)*0.05, 0.0,
            -0.33 + Math.sin(sinscalar-0.25)*0.2, -0.4 + Math.cos(sinscalar*3)*0.05,  0.0,
            -0.5 + Math.sin(sinscalar-0.25)*0.2, -0.66 + Math.cos(sinscalar*3)*0.05, 0.0,
            -0.33 + Math.sin(sinscalar-0.25)*0.2, -0.4 + Math.cos(sinscalar*3)*0.05,  0.0,
            -0.33 + Math.sin(sinscalar-0.25)*0.2, -0.66 + Math.cos(sinscalar*3)*0.05, 0.0,
            -0.5 + Math.sin(sinscalar-0.25)*0.2, -0.66 + Math.cos(sinscalar*3)*0.05, 0.0,
            -0.33 + Math.sin(sinscalar-0.25)*0.2, -0.66 + Math.cos(sinscalar*3)*0.05, 0.0,
            -0.33 + Math.sin(sinscalar-0.25)*0.2, -0.72 + Math.cos(sinscalar*3)*0.05, 0.0,
            -0.23 + Math.sin(sinscalar-0.25)*0.1, -0.4 + Math.cos(sinscalar*3)*0.05,  0.0,
            -0.06 + Math.sin(sinscalar-0.25)*0.1, -0.4 + Math.cos(sinscalar*3)*0.05,  0.0,
            -0.23 + Math.sin(sinscalar-0.25)*0.1, -0.75 + Math.cos(sinscalar*3)*0.05, 0.0,
            -0.06 + Math.sin(sinscalar-0.25)*0.1, -0.4 + Math.cos(sinscalar*3)*0.05,  0.0,
            -0.23 + Math.sin(sinscalar-0.25)*0.1, -0.75 + Math.cos(sinscalar*3)*0.05, 0.0,
            -0.06 + Math.sin(sinscalar-0.25)*0.1, -0.75 + Math.cos(sinscalar*3)*0.05, 0.0,
            -0.23 + Math.sin(sinscalar-0.25)*0.1, -0.75 + Math.cos(sinscalar*3)*0.05, 0.0,
            -0.06 + Math.sin(sinscalar-0.25)*0.1, -0.75 + Math.cos(sinscalar*3)*0.05, 0.0,
            -0.06 + Math.sin(sinscalar-0.25)*0.1, -0.80 + Math.cos(sinscalar*3)*0.05, 0.0,
             0.8 - Math.sin(sinscalar-0.25)*0.3,  -0.4 + Math.cos(sinscalar*3)*0.05,  0.0,
             0.63 - Math.sin(sinscalar-0.25)*0.3, -0.4 + Math.cos(sinscalar*3)*0.05,  0.0,
             0.8 - Math.sin(sinscalar-0.25)*0.3,  -0.57 + Math.cos(sinscalar*3)*0.05, 0.0,
             0.63 - Math.sin(sinscalar-0.25)*0.3, -0.4 + Math.cos(sinscalar*3)*0.05,  0.0,
             0.8 - Math.sin(sinscalar-0.25)*0.3,  -0.57 + Math.cos(sinscalar*3)*0.05, 0.0,
             0.63 - Math.sin(sinscalar-0.25)*0.3, -0.57 + Math.cos(sinscalar*3)*0.05, 0.0,
             0.8 - Math.sin(sinscalar-0.25)*0.3,  -0.57 + Math.cos(sinscalar*3)*0.05, 0.0,
             0.63 - Math.sin(sinscalar-0.25)*0.3, -0.57 + Math.cos(sinscalar*3)*0.05, 0.0,
             0.63 - Math.sin(sinscalar-0.25)*0.3, -0.63 + Math.cos(sinscalar*3)*0.05, 0.0,
             0.5 - Math.sin(sinscalar-0.25)*0.2,  -0.4 + Math.cos(sinscalar*3)*0.05,  0.0,
             0.5 - Math.sin(sinscalar-0.25)*0.2,  -0.66 + Math.cos(sinscalar*3)*0.05, 0.0,
             0.33 - Math.sin(sinscalar-0.25)*0.2, -0.4 + Math.cos(sinscalar*3)*0.05,  0.0,
             0.5 - Math.sin(sinscalar-0.25)*0.2,  -0.66 + Math.cos(sinscalar*3)*0.05, 0.0,
             0.33 - Math.sin(sinscalar-0.25)*0.2, -0.4 + Math.cos(sinscalar*3)*0.05,  0.0,
             0.33 - Math.sin(sinscalar-0.25)*0.2, -0.66 + Math.cos(sinscalar*3)*0.05, 0.0,
             0.5 - Math.sin(sinscalar-0.25)*0.2,  -0.66 + Math.cos(sinscalar*3)*0.05, 0.0,
             0.33 - Math.sin(sinscalar-0.25)*0.2, -0.66 + Math.cos(sinscalar*3)*0.05, 0.0,
             0.33 - Math.sin(sinscalar-0.25)*0.2, -0.72 + Math.cos(sinscalar*3)*0.05, 0.0,
             0.23 - Math.sin(sinscalar-0.25)*0.1, -0.4 + Math.cos(sinscalar*3)*0.05,  0.0,
             0.06 - Math.sin(sinscalar-0.25)*0.1, -0.4 + Math.cos(sinscalar*3)*0.05,  0.0,
             0.23 - Math.sin(sinscalar-0.25)*0.1, -0.75 + Math.cos(sinscalar*3)*0.05, 0.0,
             0.06 - Math.sin(sinscalar-0.25)*0.1, -0.4 + Math.cos(sinscalar*3)*0.05,  0.0,
             0.23 - Math.sin(sinscalar-0.25)*0.1, -0.75 + Math.cos(sinscalar*3)*0.05, 0.0,
             0.06 - Math.sin(sinscalar-0.25)*0.1, -0.75 + Math.cos(sinscalar*3)*0.05, 0.0,
             0.23 - Math.sin(sinscalar-0.25)*0.1, -0.75 + Math.cos(sinscalar*3)*0.05, 0.0,
             0.06 - Math.sin(sinscalar-0.25)*0.1, -0.75 + Math.cos(sinscalar*3)*0.05, 0.0,
             0.06 - Math.sin(sinscalar-0.25)*0.1, -0.80 + Math.cos(sinscalar*3)*0.05, 0.0,
        ];

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bottomVertices), gl.STATIC_DRAW);
        vertex2PositionBuffer.itemSize = 3;
        vertex2PositionBuffer.numberOfItems = 54;
}
