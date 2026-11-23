package com.gymak.app;
import static org.junit.Assert.*;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import android.util.Base64;
import ee.forgr.capacitor_updater.CryptoCipher;
import ee.forgr.capacitor_updater.Logger;
import java.security.*;
import javax.crypto.Cipher;
import java.io.IOException;
import org.junit.Test;
import org.junit.runner.RunWith;
/** Ephemeral test keys only. No production signing material on emulator. */
@RunWith(AndroidJUnit4.class)
public class OtaCryptoTest {
 private String hex(byte[] bytes){StringBuilder b=new StringBuilder();for(byte n:bytes)b.append(String.format("%02x",n));return b.toString();}
 private String pkcs1(KeyPair pair)throws Exception{
  java.security.interfaces.RSAPublicKey key=(java.security.interfaces.RSAPublicKey)pair.getPublic();
  // Obtain a PKCS#1 DER sequence through the standard X509 wrapper body.
  byte[] spki=key.getEncoded();int i=0;for(;i<spki.length-4;i++)if((spki[i]&255)==3&&(spki[i+1]&255)==130&&spki[i+4]==0)break;
  byte[] body=java.util.Arrays.copyOfRange(spki,i+5,spki.length);
  return "-----BEGIN RSA PUBLIC KEY-----\n"+Base64.encodeToString(body,Base64.NO_WRAP)+"\n-----END RSA PUBLIC KEY-----";
 }
 @Test public void rejectsUnsignedWrongKeyAndTampering()throws Exception{
  CryptoCipher.setLogger(new Logger("OtaCryptoTest"));
  KeyPairGenerator g=KeyPairGenerator.getInstance("RSA");g.initialize(2048);KeyPair good=g.generateKeyPair(),other=g.generateKeyPair();
  byte[] digest=MessageDigest.getInstance("SHA-256").digest("bundle fixture".getBytes("UTF-8"));
  Cipher signer=Cipher.getInstance("RSA/ECB/PKCS1Padding");signer.init(Cipher.ENCRYPT_MODE,good.getPrivate());byte[] signed=signer.doFinal(digest);
  String pub=pkcs1(good),signature=hex(signed);assertEquals(hex(digest),CryptoCipher.decryptChecksum(signature,pub));
  try{CryptoCipher.decryptChecksum(hex(digest),pub);fail("unsigned accepted");}catch(IOException expected){}
  try{CryptoCipher.decryptChecksum(signature,pkcs1(other));fail("wrong key accepted");}catch(IOException expected){}
  signed[12]^=1;try{CryptoCipher.decryptChecksum(hex(signed),pub);fail("tampering accepted");}catch(IOException expected){}
 }
}
