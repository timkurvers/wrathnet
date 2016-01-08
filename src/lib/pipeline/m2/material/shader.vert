precision highp float;

varying vec2 vUv;
varying vec2 texture0Coord;
varying vec2 texture1Coord;

varying vec3 vertexNormal;
varying vec3 vertexWorldPosition;
varying float cameraDistance;

uniform float billboarded;

#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;

	#ifdef BONE_TEXTURE
		uniform sampler2D boneTexture;
		uniform int boneTextureWidth;
		uniform int boneTextureHeight;

		mat4 getBoneMatrix( const in float i ) {
			float j = i * 4.0;
			float x = mod( j, float( boneTextureWidth ) );
			float y = floor( j / float( boneTextureWidth ) );

			float dx = 1.0 / float( boneTextureWidth );
			float dy = 1.0 / float( boneTextureHeight );

			y = dy * ( y + 0.5 );

			vec4 v1 = texture2D( boneTexture, vec2( dx * ( x + 0.5 ), y ) );
			vec4 v2 = texture2D( boneTexture, vec2( dx * ( x + 1.5 ), y ) );
			vec4 v3 = texture2D( boneTexture, vec2( dx * ( x + 2.5 ), y ) );
			vec4 v4 = texture2D( boneTexture, vec2( dx * ( x + 3.5 ), y ) );

			mat4 bone = mat4( v1, v2, v3, v4 );

			return bone;
		}
	#else
		uniform mat4 boneGlobalMatrices[ MAX_BONES ];

		mat4 getBoneMatrix( const in float i ) {
			mat4 bone = boneGlobalMatrices[ int(i) ];
			return bone;
		}
	#endif
#endif

void main() {
  vUv = uv;

  vertexNormal = normal;
  vertexWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  cameraDistance = distance(cameraPosition, vertexWorldPosition);

  // TODO: Use vertexShaderMode to determine coordinates
  vec2 texture0Coord = vec2(vUv[0], -vUv[1]);
  vec2 texture1Coord = vec2(vUv[0], -vUv[1]);

  vec3 transformed = vec3(position);

  #ifdef USE_SKINNING
  	mat4 boneMatX = getBoneMatrix(skinIndex.x);
  	mat4 boneMatY = getBoneMatrix(skinIndex.y);
  	mat4 boneMatZ = getBoneMatrix(skinIndex.z);
  	mat4 boneMatW = getBoneMatrix(skinIndex.w);
  #endif

  #ifdef USE_SKINNING
  	vec4 skinVertex = bindMatrix * vec4(transformed, 1.0);

  	vec4 skinned = vec4( 0.0 );
  	skinned += boneMatX * skinVertex * skinWeight.x;
  	skinned += boneMatY * skinVertex * skinWeight.y;
  	skinned += boneMatZ * skinVertex * skinWeight.z;
  	skinned += boneMatW * skinVertex * skinWeight.w;
  	skinned = bindMatrixInverse * skinned;
  #endif

  #ifdef USE_SKINNING
  	vec4 mvPosition = modelViewMatrix * skinned;
  #else
  	vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
  #endif

  gl_Position = projectionMatrix * mvPosition;
}
