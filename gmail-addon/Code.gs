var PRISTEEL_APP_URL = 'https://lemonstudiosks-collab.github.io/pristeel-app/pristeel-gmail-launcher.html';

function onHomepage() {
  var section = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph()
      .setText('Hap një email dhe mbaje panelin PRISTEEL të hapur. Paneli do të tregojë mundësinë për të krijuar ose lidhur një projekt.'))
    .addWidget(CardService.newTextButton()
      .setText('Hap platformën PRISTEEL')
      .setOpenLink(CardService.newOpenLink().setUrl(PRISTEEL_APP_URL)));

  return [CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('PRISTEEL'))
    .addSection(section)
    .build()];
}

function onGmailMessageOpen(e) {
  try {
    GmailApp.setCurrentMessageAccessToken(e.gmail.accessToken);
    var message = GmailApp.getMessageById(e.gmail.messageId);
    var thread = message.getThread();
    var subject = message.getSubject() || '(pa subjekt)';
    var sender = message.getFrom() || '';
    var date = message.getDate();
    var attachments = message.getAttachments({
      includeInlineImages: false,
      includeAttachments: true
    });

    var intakeUrl = PRISTEEL_APP_URL
      + '?gmail_intake=1'
      + '&gmail_message_id=' + encodeURIComponent(message.getId())
      + '&gmail_thread_id=' + encodeURIComponent(thread.getId())
      + '&subject=' + encodeURIComponent(subject)
      + '&from=' + encodeURIComponent(sender);

    var details = CardService.newCardSection()
      .addWidget(CardService.newDecoratedText()
        .setTopLabel('Subjekti')
        .setText(subject))
      .addWidget(CardService.newDecoratedText()
        .setTopLabel('Nga')
        .setText(sender))
      .addWidget(CardService.newDecoratedText()
        .setTopLabel('Data')
        .setText(Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd.MM.yyyy HH:mm')))
      .addWidget(CardService.newDecoratedText()
        .setTopLabel('Skedarë në këtë email')
        .setText(String(attachments.length)));

    var actions = CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText('Krijo një projekt të ri, lidhe gjithë thread-in dhe ruaj skedarët e klientit në dosjen Google Drive të projektit.'))
      .addWidget(CardService.newTextButton()
        .setText('Krijo ose lidhe projektin')
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setOpenLink(CardService.newOpenLink().setUrl(intakeUrl)))
      .addWidget(CardService.newTextButton()
        .setText('Hap platformën')
        .setOpenLink(CardService.newOpenLink().setUrl(PRISTEEL_APP_URL)));

    return [CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle('PRISTEEL')
        .setSubtitle('Kërkesa dhe projektet'))
      .addSection(details)
      .addSection(actions)
      .build()];
  } catch (err) {
    return [CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader().setTitle('PRISTEEL'))
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph().setText('Gabim: ' + err.message)))
      .build()];
  }
}
