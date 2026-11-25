/**
 * Body of `POST /auth/google`.
 *
 * The SPA sends the Firebase Authentication ID token it obtains from the
 * Google sign-in; its signature and validity are checked in
 * `FirebaseIdTokenVerifier`, not here (here only the shape is validated).
 */

import { IsJWT, IsNotEmpty } from 'class-validator';

export class LoginGoogleDto {
  /** Firebase ID token of the signed-in Google user. */
  @IsJWT()
  @IsNotEmpty()
  idToken: string;
}
