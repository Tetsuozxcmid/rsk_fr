import React from "react";
import { Page, Text, View, Document, StyleSheet, Image, Font } from "@react-pdf/renderer";

Font.register({
  family: "Roboto",
  src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf"
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "Roboto",
    position: "relative",
    padding: 0,
    margin: 0,
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: -1,
  },
  textWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 225,
    textAlign: "center",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  nameText: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#000000",
  },
  dateWrapper: {
    position: "absolute",
    top: 280,
    left: 0,
    right: 0,
    textAlign: "center",
    width: "100%",
  },
  dateText: {
    fontSize: 20,
    color: "#000000",
    fontWeight: "bold",
  },
  qrWrapper: {
    position: "absolute",
    bottom: 30,
    left: 52,
    alignItems: "center",
  },
  qrImage: {
    width: 80,
    height: 80,
  },
  qrTextBlock: {
    marginTop: 2,
    alignItems: "center",
  },
  qrLabel: {
    fontSize: 7,
    color: "#666666",
    textAlign: "center",
  },
  qrNumber: {
    fontSize: 7,
    color: "#666666",
    marginTop: 1,
    textAlign: "center",
  },
});

const Certificate = ({ userName, qrDataUrl, certificateNumber }) => {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const imageSrc = `${origin}/certificat.png`;

  const getCurrentDateString = () => {
    const today = new Date();
    const options = { year: "numeric", month: "long", day: "numeric" };

    let dateStr = today.toLocaleDateString("ru-RU", options);
    dateStr = dateStr.replace(/\s\u0433\.?$/, "").trim();

    return `${dateStr} г. - 12 академических часов`;
  };

  const fullDateString = getCurrentDateString();
  const certificateNumberLabel = String(certificateNumber || "").trim();

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Image
          src={imageSrc}
          alt=""
          style={styles.backgroundImage}
          fixed
        />

        <View style={styles.textWrapper}>
          <Text style={styles.nameText}>{userName}</Text>
        </View>

        <View style={styles.dateWrapper}>
          <Text style={styles.dateText}>{fullDateString}</Text>
        </View>

        {qrDataUrl && (
          <View style={styles.qrWrapper}>
            <Image src={qrDataUrl} alt="" style={styles.qrImage} />
            <View style={styles.qrTextBlock}>
              <Text style={styles.qrLabel}>Проверить сертификат</Text>
              {certificateNumberLabel ? <Text style={styles.qrNumber}>Сертификат № {certificateNumberLabel}</Text> : null}
            </View>
          </View>
        )}
      </Page>
    </Document>
  );
};

export default Certificate;
