import {
  getChannelListInfo, getChannelListInfoWithoutUpdate,
  getCurrentChannel,
  getToken,
  getUserId,
  getUserInfoWithoutFetch, setCurrentChannel, updateChannelListInfo,
  updateUserInfo
} from "./main.js";
import {fetchWithBackEnd, fileToDataUrl,} from "./helpers.js";
import {throwError} from "./error.js";
import {openMyProfile, openUserProfile} from "./user.js";
import {throwToast} from "./toast.js";

const title = document.getElementById('message-channel-title');
const messageBody = document.getElementById('message-part-inner-container')
const messageViewBody = document.getElementById('message-view-body-container');
const send = document.getElementById('send-button');
const messageInput = document.getElementById('message-input');
const messageContainer = {}
const pinnedList = {};
const photoList = {};
let pinPopoverHTML = undefined;;
let ul = undefined;;

let popover = 0;
let photoId = undefined;
let editMessageId = undefined;
let editMessageContainer = undefined;
let editMessageBottom = undefined;
let emojiList = ['😀', '😥', '😡', '👍', '❤️']

// Init Message Page
export const initMessagePage = async (id, detail) => {
  // If the window is small, hide channel list and show message part
  if (window.innerWidth < 1000) {
    document.getElementById('channel-list-container').style.display = 'none';
    document.getElementById('channel-list-container').style.flex = 0;
    document.getElementById('message-part-container').style.display = 'flex';
    document.getElementById('message-part-container').style.flex = 22;
  }

  // Set Popover HTML for pin list, use dispose to avoid switch channel without close popover
  pinPopoverHTML && pinPopoverHTML.dispose();
  // Set ul for pin list clean for last channel
  ul && ul.remove();
  messageBody.style.display = 'flex';
  title.innerHTML = detail.name;
  messageViewBody.innerHTML = '';

  ul = document.createElement('ul');
  ul.className = 'list-group'

  // Initial Pin List individually
  await getPinMessage().catch(err => throwError('Get Pin Message Error', err));

  // Set Popover HTML for pin list
  pinPopoverHTML = new bootstrap.Popover(document.getElementById('pin-list'), {
    placement: 'bottom',
    html: true,
    container: 'body',
    title: 'Pinned Messages',
    content: ul,
    customClass: 'popover-container'
  })

  // Update each user info for provide user avatar, name which sent message in channel
  await updateUserInfo().catch(err => throwError('Get User Info Error', err));

  // Get message from backend for max 25 message, and set load more message button if there is more message
  fetchWithBackEnd(`/message/${id}?start=${0}`, 'GET', undefined, getToken())
    .then(async (response) => {
      for (const message of [...response.messages].reverse()) {
        await insertMessage(message).catch(err => console.log(err));
      }

      if (response.messages.length === 25) {
        messageViewBody.insertBefore(initLoadMore(), messageViewBody.firstChild);
      }
    })
    .then(() => {messageViewBody.scrollTo(0, messageViewBody.scrollHeight)})
    .catch((error) => {
        console.log(error);
    })
}

// When init a message, set a dictionary to summary all emoji response
const getReact = (detail) => {
  const react = [];
  const emojiCount = {'😀': 0, '😥': 0, '😡': 0, '👍': 0, '❤️': 0};
  detail.reacts.forEach(each => {
    if (each.user === getUserId()) react.push(each.react)
    emojiCount[each.react] ++;
  })
  return [react, emojiCount];
};

// Change the emoji dictionary to sentence, like '😀 x2 😥 x1'
const sentenceReact = (emojiCount) => {
  let sentence = ' ';
  Object.keys(emojiCount).forEach(each => {
    if (emojiCount[each] === 1) sentence += `${each} `;
    else if (emojiCount[each] !== 0) sentence += `${each} x${emojiCount[each]} `;
  })
  return sentence;
}

// Init load more message button
const initLoadMore = () => {
  const div = document.createElement('div');
  div.className = 'each-message-container loading-more-message-container';
  div.id = 'load-more-message-container';

  const notice = document.createElement('button');
  notice.textContent = 'Load More Message';
  notice.className = 'btn btn-link';
  notice.type = 'button';
  notice.id = 'load-more-message';
  div.appendChild(notice);

  notice.addEventListener('click', async () =>
    await LoadMoreMessage().catch(err => throwError('Load More Message Error', err))
  );
  return div;
}

// When click load more message button, get more message from backend, If there is 25 message,
// set load more message button again
const LoadMoreMessage = async () => {
  const notice = document.getElementById('load-more-message');
  const div = document.getElementById('load-more-message-container');

  notice.textContent = 'Loading...';
  notice.disabled = true;

  const prevScrollHeight = messageViewBody.scrollHeight;
  await fetchWithBackEnd(`/message/${getCurrentChannel()}?start=${Object.keys(messageContainer).length}`, 'GET', undefined, getToken())
    .then(async (response) => {
      messageViewBody.removeChild(div);
      // If there is no more message, set toast notice for no more message
      if (response.messages.length === 0) {
        throwToast('No More Message', 'There is no more message to load.')
        return;
      }
      for (const message of response.messages) {
        await insertMessage(message, true).catch(err => console.log(err));
      }

      // If there is 25 message, set load more message button again
      if (response.messages.length === 25) {
        notice.textContent = 'Load More Message';
        notice.disabled = false;
        messageViewBody.insertBefore(div, messageViewBody.firstChild);
      }
    })
    .then(() => messageViewBody.scrollTop = messageViewBody.scrollHeight - prevScrollHeight)
    .catch((error) => {
      throwError('Get Message Error', error)
    });
}

// Insert a message
const insertMessage = async (detail, position) => {
  const check = detail.sender === getUserId();
  const response = getUserInfoWithoutFetch(detail.sender);

  const div1 = document.createElement('div');
  div1.className = 'each-message-container';
  if (check) div1.classList.add('reverse-each-message-container');

  const div2 = document.createElement('div');
  div2.className = 'each-message-avatar-container';
  div2.classList.add(check ? 'right-each-message-avatar-container' : 'left-each-message-avatar-container');

  const div3 = document.createElement('div');
  div3.className = 'message-detail-container';

  const div4 = document.createElement('div');
  div4.className = 'each-message-avatar-inner-container';
  div4.classList.add(check ? 'right-each-message-avatar-inner-container' : 'left-each-message-avatar-inner-container');

  const img = document.createElement('img');
  img.alt = 'avatar';
  img.src = response.avatar || 'resource/avatar.png';
  img.className = 'click-available';

  // when avatar clicked, open user profile
  img.addEventListener('click', () => {
    check ? openMyProfile(detail.sender) : openUserProfile(detail.sender);
  });

  div4.appendChild(img);

  const div5 = document.createElement('div');
  div5.className = 'message-detail-container';

  div2.appendChild(div3);
  div2.appendChild(div4);
  div2.appendChild(div5);
  div1.appendChild(div2);

  const div6 = document.createElement('div');
  div6.className = 'each-message-body-container';
  div6.classList.add(check ? 'right-each-message-body-container' : 'left-each-message-body-container');

  const div7 = document.createElement('div');
  div7.className = 'message-detail-container each-message-name';
  const span = document.createElement('span');
  span.className = 'click-available';
  span.textContent = response.name;

  // when name clicked, open user profile
  span.addEventListener('click', () => {
    check ? openMyProfile(detail.sender) : openUserProfile(detail.sender);
  });

  div7.appendChild(span);

  const div8 = document.createElement('div');
  div8.className = 'each-message-info-container click-available';
  div8.classList.add(check ? 'right-each-message-info-container' : 'left-each-message-info-container');

  // If message is pinned, set pinned list for scroll to message position when click
  if (detail.pinned) {
    div8.classList.add('pin-message') ;
    pinnedList[detail.id][0] = div1;
  }

  // Separate message and photo
  if (detail.message !== undefined) div8.textContent = detail.message;
  else {
    const img = document.createElement('img');
    img.className = 'rounded float-start';
    img.src = detail.image;
    img.alt = 'image';
    div8.appendChild(img);

    // If photo clicked, open photo view page, avoid message popover show at the same time,
    // If want to pin, edit or delete photo, click round of photo
    img.addEventListener('click', event => {
      event.stopPropagation();
      photoId = detail.id;
      document.getElementById('view-photo-page').style.display = 'flex';
      document.getElementById('view-photo-content').src = detail.image;

      // Set last photo and next photo button disable if there is no more photo
      let left = 0;
      let right = 0;
      for (const each of Object.keys(photoList)) {
        if (each < detail.id) left++;
        else if (each > detail.id) right++;
      }

      document.getElementById('last-photo').disabled = left === 0;
      document.getElementById('next-photo').disabled = right === 0;
    })
  }

  const div9 = document.createElement('div');
  div9.className = 'message-detail-container';

  // Set emoji response list to summary all emoji response
  const temp = getReact(detail);
  const reactNow = temp[0];
  const emojiCount = temp[1];

  // Set time, emoji response, and edited message
  const time = (detail.editedAt ? detail.editedAt : detail.sentAt)
    .match(/(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}):\d{2}\.\d{3}Z/);
  const spanTime = document.createElement('span');
  const spanEmoji = document.createElement('span');
  const spanEdited = document.createElement('span');

  spanTime.textContent = `${time[1]} ${time[2]}`;
  spanEmoji.textContent = sentenceReact(emojiCount);
  spanEdited.textContent = detail.edited ? ' (Edited) ' : '';

  // For other message, follow [time, emoji response, and edited message order]
  // For my message, follow [edited message, time, and emoji response order]
  if (check) {
    div9.appendChild(spanEdited);
    div9.appendChild(spanEmoji);
    div9.appendChild(spanTime);
  } else {
    div9.appendChild(spanTime);
    div9.appendChild(spanEmoji);
    div9.appendChild(spanEdited);
  }

  const divPopover = document.createElement('div');

  // Set pin icon in message popover title
  const pin = document.createElement('img');
  pin.src = detail.pinned ? 'resource/unpin.svg' : 'resource/pin.svg';
  pin.alt = 'pin';
  pin.className = 'popover-image click-available';
  divPopover.appendChild(pin);

  // Set five emoji for response in message popover content
  const react = document.createElement('div');
  react.className = 'response-popover-container';

  let popoverHTML;

  // If message is my message, set popover for edit and delete message
  if (check) {
    div8.setAttribute('data-bs-placement', 'left' )

    const edit = document.createElement('img');
    edit.src = 'resource/edit.svg';
    edit.alt = 'edit';
    edit.className = 'popover-image click-available';

    const trash = document.createElement('img');
    trash.src = 'resource/trash.svg';
    trash.alt = 'trash';
    trash.className = 'popover-image click-available';

    divPopover.appendChild(edit);
    divPopover.appendChild(trash);

    // Set popover for message
    popoverHTML = new bootstrap.Popover(div8, {
      placement: 'left',
      title: divPopover,
      content: react,
      html: true,
      container: 'body',
      toggle: popover,
      customClass: 'popover-container',
    })

    // When click edit message, set edit message page display and set message id for edit, If message is photo,
    // set another edit page for edit photo
    edit.addEventListener('click', () => {
      if (detail.message === undefined) {
        document.getElementById('edit-picture-page').style.display = 'flex';
        editMessageId = detail.id;
        editMessageContainer = div8;
        editMessageBottom = [spanEdited, spanTime];
        popoverHTML.hide();
      }
      else {
        document.getElementById('edit-message-page').style.display = 'flex';
        document.getElementById('edit-message-content').value = detail.message;
        editMessageId = detail.id;
        editMessageContainer = div8;
        editMessageBottom = [spanEdited, spanTime];
        popoverHTML.hide();
      }
    });

    // When click delete message, delete message from backend and remove message from message view,
    // If message is photo, delete photo from backend and remove photo from photo list
    // If message is pinned, remove message from pinned list
    trash.addEventListener('click', () => {
      fetchWithBackEnd(`/message/${getCurrentChannel()}/${detail.id}`, 'DELETE', undefined, getToken())
        .then(async () => {
          messageViewBody.removeChild(div1);
          throwToast('Delete Message', 'Message deleted successfully.');
          popoverHTML.dispose();
          popover --;
          if (popover === 0) messageViewBody.style.overflowY = 'auto';

          if (pinnedList[detail.id]) {
            ul.removeChild(pinnedList[detail.id][1]);
            delete pinnedList[detail.id];
          }

          if (detail.image) delete photoList[detail.id];
        })
    })
  } else {
    popoverHTML = new bootstrap.Popover(div8, {
      placement: 'right',
      html: true,
      container: 'body',
      toggle: popover,
      title: divPopover,
      content: react,
      customClass: 'popover-container',
    })
  }

  // Set emoji response for message popover content
  emojiList.forEach(emoji => {
    const reactEmojiContainer = document.createElement('div');
    reactEmojiContainer.className = 'response-react';
    const reactEmoji = document.createElement('div');
    reactEmoji.className = 'response-react-inner-container';
    reactNow.includes(emoji) && reactEmoji.classList.add('selected-react');
    reactEmoji.textContent = emoji;

    // If emoji clicked, send emoji response to backend, and update emoji response list
    reactEmoji.addEventListener('click', () => {
      // If emoji is selected, send react emoji response to backend and set grey background to notice user
      if (!reactEmoji.classList.contains('selected-react')) {
        fetchWithBackEnd(`/message/react/${getCurrentChannel()}/${detail.id}`, 'POST', {
          'react': emoji
        }, getToken())
          .then(() => {
            reactEmoji.classList.add('selected-react');
            emojiCount[emoji] ++;
            spanEmoji.textContent = sentenceReact(emojiCount);
            popoverHTML.hide();
          })
          .catch(err => {
            popoverHTML.hide();
            throwError('React Message Error', err)
          });
      } else {
        // If emoji is not selected, send unreact emoji response to backend and set white background to notice user
        fetchWithBackEnd(`/message/unreact/${getCurrentChannel()}/${detail.id}`, 'POST', {
          'react': emoji
        }, getToken())
          .then(() => {
            reactEmoji.classList.remove('selected-react')
            emojiCount[emoji] --;
            spanEmoji.textContent = sentenceReact(emojiCount);
            popoverHTML.hide();
          })
          .catch(err => {
            popoverHTML.hide();
            throwError('React Message Error', err)
          });
      }
    });

    reactEmojiContainer.appendChild(reactEmoji);
    react.appendChild(reactEmojiContainer);
  })

  // Set pin icon for message popover title
  pin.addEventListener('click', () => {
    // If message is pinned, send unpin message to backend and set unpin icon to notice user, remove the html element
    if (div8.classList.contains('pin-message'))
      fetchWithBackEnd(`/message/unpin/${getCurrentChannel()}/${detail.id}`,
        'POST',
        undefined, getToken())
        .then(() => {
          pin.src = 'resource/pin.svg';
          div8.classList.remove('pin-message');
          popoverHTML.hide();
          ul.removeChild(pinnedList[detail.id][1])
          delete pinnedList[detail.id];
        }).catch(err => throwError('Pin Message Error', err));
    else
      // If message is not pinned, send pin message to backend and set pin icon to notice user, record the html element
      // for scroll to message position when click message in pin list
      fetchWithBackEnd(`/message/pin/${getCurrentChannel()}/${detail.id}`,
        'POST',
        undefined, getToken())
        .then(() => {
          pin.src = 'resource/unpin.svg';
          div8.classList.add('pin-message');
          popoverHTML.hide();

          const list = Object.keys(pinnedList);
          let position = undefined;
          for (const each of list) {
            if (each > detail.id) {
              position = pinnedList[each][1];
              break;
            }
          }

          const li = insertPinMessage(detail.message || '[Photo]', detail.id);
          pinnedList[detail.id] = [div1, li];
          if (position) {
            ul.insertBefore(li, position);
          }
          else ul.appendChild(li);
        })
  });

  // Set a counter for message popover, if popover is shown, the message page can not scroll
  div8.addEventListener('shown.bs.popover', function () {
    popover ++;
    messageViewBody.style.overflowY = 'hidden';
  });

  // Remove a counter for message popover, if all popover are hidden, the message page can scroll
  div8.addEventListener('hidden.bs.popover', function () {
    popover --;
    if (popover === 0) messageViewBody.style.overflowY = 'auto';
  });

  div6.appendChild(div7);
  div6.appendChild(div8);
  div6.appendChild(div9);
  div1.appendChild(div6);

  // Check the message is insert in the top or bottom of message view for insert more message
  if (position) messageViewBody.insertBefore(div1, messageViewBody.firstChild);
  else messageViewBody.appendChild(div1);

  messageContainer[detail.id] = [div1, detail];
}

// Can use enter to send message
window.addEventListener('keydown', event => {
  if (event.key === 'Enter') send.click();
});

// When click send button, send message to backend, and insert message to message view
send.addEventListener('click', () => {
  // If message is empty or all space, set message to empty and notice user
  if (new RegExp(/^ *$/).test(messageInput.value)) {
    messageInput.value = '';
    throwError('Invalid Message', 'Please enter a message.');
    return;
  }

  // Send message to backend, and get message from backend for insert message to message view
  fetchWithBackEnd(`/message/${getCurrentChannel()}`, 'POST', {
    'message': messageInput.value
  }, getToken()).then(() => {
    fetchWithBackEnd(`/message/${getCurrentChannel()}?start=${0}`, 'GET', undefined, getToken())
      .then(async (response) => {
        const temp = Object.keys(messageContainer);
        let max = -1;
        for (const each of temp) if (each > max) max = parseInt(each);

        for (const message of [...response.messages].reverse()) {
          if (message.id > max) await insertMessage(message).catch(err => throwError('Insert Message Error', err));
        }

        // Set to bottom of message view
        messageViewBody.scrollTo(0, messageViewBody.scrollHeight);
        messageInput.value = '';
      })
    .catch(err => console.log(err));
  });
});

// Close the edit message page
document.getElementById('edit-message-cancel').addEventListener('click', () => {
  document.getElementById('edit-message-page').style.display = 'none';
});

// Submit the changing for a message to backend, and update message view
document.getElementById('edit-message-save').addEventListener('click', () => {

  // If message is empty or all space, set message to empty and notice user
  if (new RegExp(/^ *$/).test(document.getElementById('edit-message-content').value)) {
    throwError('Invalid Message', 'Please enter a message.');
    return;
  }

  fetchWithBackEnd(`/message/${getCurrentChannel()}/${editMessageId}`, 'PUT', {
    'message': document.getElementById('edit-message-content').value
  }, getToken()).then(() => {
    // Show the edited, and edited time
    editMessageContainer.textContent = document.getElementById('edit-message-content').value;
    editMessageBottom[0].textContent = ' (Edited) ';
    const time = new Date().toISOString().match(/(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}):\d{2}\.\d{3}Z/);
    editMessageBottom[1].textContent = `${time[1]} ${time[2]}`;
    document.getElementById('edit-message-page').style.display = 'none';

    // If the message is pinned, update the message in pin list
    if (pinnedList[editMessageId]) {
      pinnedList[editMessageId][1].textContent = document.getElementById('edit-message-content').value;
    }
  }).catch(err => throwError('Edit Message Error', err));
});

// Close the edit photo page
document.getElementById('edit-message-x-close').addEventListener('click', () => {
  document.getElementById('edit-message-page').style.display = 'none';
});

// In edit channel page, click edit can edit channel title, type, and description, If click, change the icon to confirm
// Check the channel title, type and description is valid, If valid, throw error
document.getElementById('edit-channel-profile-title-icon').addEventListener('click', () => {
  document.getElementById('confirm-channel-profile-title-icon').style.display = 'flex';
  document.getElementById('edit-channel-profile-title-icon').style.display = 'none';
  document.getElementById('channel-profile-title').disabled = false;
  document.getElementById('channel-profile-title').focus();
});

document.getElementById('confirm-channel-profile-title-icon').addEventListener('click', () => {
  if (!document.getElementById('channel-profile-title').value) {
    throwError('Invalid Channel Title', 'Please enter a channel title.');
    return;
  }

  document.getElementById('edit-channel-profile-title-icon').style.display = 'flex';
  document.getElementById('confirm-channel-profile-title-icon').style.display = 'none';
  document.getElementById('channel-profile-title').disabled = true;
});

document.getElementById('edit-channel-profile-type-icon').addEventListener('click', () => {
  document.getElementById('confirm-channel-profile-type-icon').style.display = 'flex';
  document.getElementById('edit-channel-profile-type-icon').style.display = 'none';
  document.getElementById('edit-channel-profile-type').disabled = false;
  document.getElementById('edit-channel-profile-type').focus();
});

document.getElementById('confirm-channel-profile-type-icon').addEventListener('click', () => {
  document.getElementById('confirm-channel-profile-type-icon').style.display = 'none';
  document.getElementById('edit-channel-profile-type-icon').style.display = 'flex';
  document.getElementById('edit-channel-profile-type').disabled = true;
});

document.getElementById('edit-channel-profile-description-icon').addEventListener('click', () => {
  document.getElementById('confirm-channel-profile-description-icon').style.display = 'flex';
  document.getElementById('edit-channel-profile-description-icon').style.display = 'none';
  document.getElementById('channel-profile-description').disabled = false;
  document.getElementById('channel-profile-description').focus();
});

document.getElementById('confirm-channel-profile-description-icon').addEventListener('click', () => {
  document.getElementById('confirm-channel-profile-description-icon').style.display = 'none';
  document.getElementById('edit-channel-profile-description-icon').style.display = 'flex';
  document.getElementById('channel-profile-description').disabled = true;
});

document.getElementById('edit-channel-cancel').addEventListener('click', () => {
  document.getElementById('edit-channel-page').style.display = 'none';
});

document.getElementById('edit-channel-profile-x-close').addEventListener('click', () => {
  document.getElementById('edit-channel-page').style.display = 'none';
});

// When click more detail, show the edit channel page, and get channel info from backend
document.getElementById('channel-more-detail').addEventListener('click', () => {
  document.getElementById('edit-channel-profile-title-icon').style.display = 'flex';
  document.getElementById('confirm-channel-profile-title-icon').style.display = 'none';
  document.getElementById('channel-profile-title').disabled = true;

  document.getElementById('edit-channel-profile-type-icon').style.display = 'flex';
  document.getElementById('confirm-channel-profile-type-icon').style.display = 'none';
  document.getElementById('edit-channel-profile-type').disabled = true;

  document.getElementById('edit-channel-profile-description-icon').style.display = 'flex';
  document.getElementById('confirm-channel-profile-description-icon').style.display = 'none';
  document.getElementById('channel-profile-description').disabled = true;

  getChannelListInfo(getCurrentChannel())
    .then((response) => {
      document.getElementById('edit-channel-page').style.display = 'flex';
      document.getElementById('channel-profile-title').value = response.name;
      document.getElementById('channel-profile-description').value = response.description;
      document.getElementById('edit-channel-profile-type').value = response.private ? '1' : '2';
      const time = response.createdAt.match(/(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}):\d{2}\.\d{3}Z/);
      document.getElementById('channel-profile-create-date').value = `${time[1]} ${time[2]}`;
    })
});

// When click exit channel, send leave channel to backend, and update channel list info
document.getElementById('exit-channel').addEventListener('click', () => {
  fetchWithBackEnd(`/channel/${getCurrentChannel()}/leave`, 'POST', undefined, getToken())
    .then(() => {
      // If channel is private, remove channel from channel list
      if (getChannelListInfoWithoutUpdate(getCurrentChannel()).private) {
        const channelButton = document.getElementsByClassName(`selected-channel-list-each`)[0];
        channelButton.parentNode.removeChild(channelButton);
      }
      messageBody.style.display = 'none';
      document.getElementById('edit-channel-page').style.display = 'none';
      throwToast('Leave Channel Success', 'You have successfully leave this channel.');

      setCurrentChannel(undefined);
    })
    .then(() => {updateChannelListInfo().catch(err => throwError('Get Channel List Info Error', err))})
    .catch(err => throwError('Leave Channel Error', err));
});

// When submit channel submit, check the channel title, type and description is valid, If valid, send edit channel to backend,
document.getElementById('edit-channel-submit').addEventListener('click', () => {
  const elements = document.querySelectorAll('.check2-square-icon');
  for (let i = 0; i < elements.length; i++) {
    if (window.getComputedStyle(elements[i]).display !== 'none') {
      throwError('Invalid Input', 'Please click confirm button change first.');
      return;
    }
  }

  const body = {};
  const origin = getChannelListInfoWithoutUpdate(getCurrentChannel());

  if (document.getElementById('channel-profile-title').value !== origin.name)
    body.name = document.getElementById('channel-profile-title').value;

  if (document.getElementById('channel-profile-description').value !== origin.description &&
  !(document.getElementById('channel-profile-description').value === '' && origin.description !== null))
    body.description = document.getElementById('channel-profile-description').value;

  if (document.getElementById('edit-channel-profile-type').value === '1' && !origin.private)
    body.private = true;
  else if (document.getElementById('edit-channel-profile-type').value === '2' && origin.private)
    body.private = false;

  if (Object.keys(body).length === 0) {
    document.getElementById('edit-channel-page').style.display = 'none';
    return;
  }

  // If success, update channel list info, and update channel name in channel list
  fetchWithBackEnd(`/channel/${getCurrentChannel()}`, 'PUT', body, getToken())
    .then(() => {
      document.getElementById('edit-channel-page').style.display = 'none';
      throwToast('Edit Channel Success', 'You have successfully edit this channel.');
      const channelButton = document.getElementsByClassName(`channel-name`);
      for (let i = 0; i < channelButton.length; i++) {
        if (channelButton[i].innerHTML === origin.name) {
          channelButton[i].innerHTML = body.name || origin.name;
          break;
        }
      }
      title.innerHTML = body.name || origin.name;
    })
    .then(() => {updateChannelListInfo().catch(err => throwError('Get Channel List Info Error', err))})
});


// Initial get all message from backend, and insert pin message to pin list,
// what is more, record all photo in photo list
const getPinMessage = async () => {
  let start = 0;
  let check = true;
  while (check) {
    await fetchWithBackEnd(`/message/${getCurrentChannel()}?start=${start}`, 'GET', undefined, getToken())
      .then(async (response) => {
        const length = response.messages.length;
        if (length === 0) {
          check = false;
          return;
        }

        for (const message of response.messages) {
          if (message.image !== undefined) photoList[parseInt(message.id)] = message.image;

          // The structure of pin list is {message id, [html element, pin list element]}
          // html element is for scroll to message position when click message in pin list
          // pin list element is for remove or edit message from pin list when unpin message, or edit message
          if (message.pinned) {
            const li = insertPinMessage(message.message || '[Photo]', message.id);
            ul.insertBefore(li, ul.firstChild);
            pinnedList[parseInt(message.id)] = [undefined, li];
          }
        }
        start += length;
      })
  }
};

// insert pin message to pin list
const insertPinMessage = (message, id) => {
  const li = document.createElement('li');
  li.className = 'list-group-item';
  li.style.cursor = 'pointer';
  li.textContent = message;

  li.addEventListener('click', async () => {
    // If message is not loaded, load more message, and then check the message is loaded
    // until the message is loaded, scroll to message position
    while (pinnedList[id][0] === undefined) {
      document.getElementById('load-more-message').scrollIntoView({behavior: 'smooth', block: 'start'});
      await LoadMoreMessage().catch(err => throwError('Load More Message Error', err));
    }

    pinnedList[id][0].scrollIntoView({behavior: 'smooth', block: 'start'});
    pinPopoverHTML.hide();
  })
  return li;
}

// When click photo icon, change to click none display picture input button
document.getElementById('send-photo-icon').addEventListener('click', () => {
  document.getElementById('photo-send').click();
})

// Send photo to backend, and update message view
document.getElementById('photo-send').addEventListener('change', async () => {
  let result = null;
  await fileToDataUrl(document.getElementById('photo-send').files[0])
    .then((response) => {
      result = response;
      document.getElementById('photo-send').value = '';
    })
    .catch(err => throwError('Send Photo Error', err))


  fetchWithBackEnd(`/message/${getCurrentChannel()}`, 'POST', {
    'image': result
  }, getToken()).then(() => {
    // If success, get message from backend, insert message to message view and update photo list
    fetchWithBackEnd(`/message/${getCurrentChannel()}?start=${0}`, 'GET', undefined, getToken())
      .then(async (response) => {
        const temp = Object.keys(messageContainer);
        let max = -1;
        for (const each of temp) if (each > max) max = parseInt(each);

        for (const message of [...response.messages].reverse()) {
          if (message.id > max) {
            photoList[parseInt(message.id)] = message.image;
            await insertMessage(message).catch(err => throwError('Send Photo Error', err));
          }
        }

        messageViewBody.scrollTo(0, messageViewBody.scrollHeight);
      })
  });
})

// When click edit picture, close edit picture page
document.getElementById('edit-picture-cancel').addEventListener('click', () => {
  document.getElementById('edit-picture-page').style.display = 'none';
  document.getElementById('edit-picture-input').value = '';
})

// When click edit picture, close edit picture page
document.getElementById('edit-picture-x-close').addEventListener('click', () => {
  document.getElementById('edit-picture-page').style.display = 'none';
  document.getElementById('edit-picture-input').value = '';
})

// When click edit picture, send edit picture to backend, and update message view
document.getElementById('edit-picture-save').addEventListener('click', async () => {
  if (!document.getElementById('edit-picture-input').value) {
    throwError('Invalid Input', 'Please select a picture.');
    return;
  }

  let result;
  await fileToDataUrl(document.getElementById('edit-picture-input').files[0])
    .then((response) => {
      result = response;
      document.getElementById('edit-picture-input').value = '';
    })
    .catch(err => throwError('Edit Picture Error', err));

  fetchWithBackEnd(`/message/${getCurrentChannel()}/${editMessageId}`, 'PUT', {
    'image': result
  }, getToken()).then(() => {
    // if success, update message view and photo list
    editMessageContainer.innerHTML = `<img class="rounded float-start" src="${result}" alt="image">`;
    document.getElementById('edit-picture-page').style.display = 'none';
    editMessageBottom[0].textContent = ' (Edited) ';
    const time = new Date().toISOString().match(/(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}):\d{2}\.\d{3}Z/);
    editMessageBottom[1].textContent = `${time[1]} ${time[2]}`;
    photoList[editMessageId] = result;
    throwToast('Edit Picture Success', 'You have successfully edit this picture.');
  });
})

// When click view photo page close button, close view photo page
document.getElementById('view-photo-x-close').addEventListener('click', () => {
  document.getElementById('view-photo-page').style.display = 'none';
});

// When click view photo page last photo button, show last photo and check if there is any photo before
document.getElementById('last-photo').addEventListener('click', () => {
  const list = [];
  for (const each of Object.keys(photoList)) {
    if (parseInt(each) < photoId) list.push(parseInt(each));
  }

  list.sort();
  document.getElementById('view-photo-content').src = photoList[list[list.length - 1]];
  photoId = list[list.length - 1];
  document.getElementById('last-photo').disabled = list.length === 1;
  document.getElementById('next-photo').disabled = false;
});

// When click view photo page next photo button, show next photo and check if there is any photo after
document.getElementById('next-photo').addEventListener('click', () => {
  const list = [];
  for (const each of Object.keys(photoList)) {
    if (parseInt(each) > photoId) list.push(parseInt(each));
  }

  list.sort();
  document.getElementById('view-photo-content').src = photoList[list[0]];
  photoId = list[0];
  document.getElementById('next-photo').disabled = list.length === 1;
  document.getElementById('last-photo').disabled = false;
});

// When click exit, close message view, mainly for mobile view, click exit can switch to channel list
document.getElementById('exit').addEventListener('click', () => {
  document.getElementsByClassName('selected-channel-list-each')[0].classList.remove('selected-channel-list-each');

  if (window.innerWidth < 1000) {
    document.getElementById('message-part-container').style.display = 'none';
    document.getElementById('message-part-container').style.flex = 0;
    document.getElementById('channel-list-container').style.display = 'flex';
    document.getElementById('channel-list-container').style.flex = 22;
    messageViewBody.innerHTML = '';
    setCurrentChannel(undefined);
  } else {
    messageViewBody.innerHTML = '';
    messageBody.style.display = 'none';
  }
})