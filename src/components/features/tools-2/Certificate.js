import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Регистрируем шрифт
Font.register({
  family: 'Roboto',
  src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf'
});

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Roboto',
    position: 'relative',
    padding: 0, // ВАЖНО: Убираем стандартные отступы, чтобы не было 2 страниц
    margin: 0,
  },
  // Картинка на весь фон
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%', // Растягиваем на всю ширину
    height: '100%', // Растягиваем на всю высоту
    zIndex: -1,
  },
  // Блок для имени
  textWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    // --- НАСТРОЙКИ ПОЛОЖЕНИЯ ---
    top: 280,            // Регулируйте высоту здесь (повыше/пониже)
    textAlign: 'center', // Центрирование по горизонтали
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  nameText: {
    fontSize: 30,        
    fontWeight: 'bold',
    color: '#000000',    
  },
  // Блок для даты
  dateWrapper: {
    position: 'absolute',
    bottom: 40,           // Оставляем тот же уровень по вертикали
    left: 0,              // Добавляем
    right: 0,             // Добавляем
    textAlign: 'center',  // Центрируем текст
    width: '100%',        // Растягиваем на всю ширину
  },
  dateText: {
    fontSize: 12,
    color: '#333333',
  }
});

const Certificate = ({ userName, date }) => {
  // Вычисляем полный путь к картинке, чтобы PDF точно ее нашел
  // Если мы в браузере, берем текущий адрес сайта
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const imageSrc = `${origin}/certificat.png`;

  return (
    <Document>
      {/* Убедитесь, что orientation соответствует вашей картинке (landscape - горизонтально) */}
      <Page size="A4" orientation="landscape" style={styles.page}>
        
        {/* Фоновая картинка с полным путем */}
        <Image 
          src={imageSrc} 
          style={styles.backgroundImage} 
          fixed // Помогает зафиксировать изображение
        />

        <View style={styles.textWrapper}>
          <Text style={styles.nameText}>{userName}</Text>
        </View>

        <View style={styles.dateWrapper}>
           <Text style={styles.dateText}>{date}</Text>
        </View>

      </Page>
    </Document>
  );
};

export default Certificate;