import {
  getToken,
  getUserId,
  setProfile,
  getChannelListInfo,
  requestNewUserList,
  setCurrentChannel,
  getCurrentChannel,
  updateChannelListInfo,
  getChannelListInfoWithoutUpdate, setTokenAndUserId
} from "./main.js";
import { fetchWithBackEnd } from "./helpers.js";
import { throwError } from "./error.js";
import { throwToast } from "./toast.js";
import { initMessagePage } from "./message.js";

const body = document.getElementById('main-structure');
const channelListBody = document.getElementById('channel-list-body');
const createChannelBody = document.getElementById('create-channel');
const createChannelTitle = document.getElementById('create-channel-title');
const createChannelType = document.getElementById('create-channel-type');
const createChannelDescription = document.getElementById('create-channel-description');


// init main structure, navbar, channel list, message part
export const initMainStructure = () => {
  channelListBody.innerHTML = '';

  // fetch log in info
  fetchWithBackEnd(`/user/${getUserId()}`, 'GET', undefined, getToken())
    .then((response) => {
      setProfile(response);
      body.style.display = 'flex';
      if (response.image) document.getElementById('navbar-avatar').src = response.image;
    })
    .catch((error) => {
      throwError('Get User Info Error', error);
    });

  // set message part display to none if window width is less than 1000px
  if (window.innerWidth < 1000) {
    document.getElementById('message-part-container').style.display = 'none';
    document.getElementById('message-part-container').style.flex = 0;
  }

  // update channel list info and set channel list
  updateChannelListInfo()
    .then((response) => {
      const userId = getUserId();
      for (const key in response) {
        const value = response[key];
        if (value.private && value.creator !== userId && !value.members.includes(userId)) continue;
        channelListBody.appendChild(insertChannel(value.private, value.name, key));
      }
    }).catch((error) => {
      throwError('Get Channel List Error', error)
    });

  // update user list
  requestNewUserList().catch((error) => { throwError('Get User List Error', error) });
}


// insert each channel list
const insertChannel = (type, name, id) => {
  const div1 = document.createElement('div');
  div1.className = 'channel-list-each-container';
  const div2 = document.createElement('div');
  div2.className = 'channel-list-each';
  const img = document.createElement('img');
  img.className = 'channel-icon';
  img.src = type ? 'resource/private.svg' : 'resource/public.svg';
  img.alt = type ? 'private channel' : 'public channel';
  const div3 = document.createElement('div');
  div3.className = 'channel-name';
  div3.textContent = name;
  div2.appendChild(img);
  div2.appendChild(div3);
  div1.appendChild(div2);

  // Listen for each channel list click event, if click, set current channel and init message page
  div1.addEventListener('click', () => {
    document.querySelectorAll('.channel-list-each-container').forEach(each =>
      each.classList.remove('selected-channel-list-each')
    );
    div1.classList.add('selected-channel-list-each');
    setCurrentChannel(id);

    getChannelListInfo(id).then((channelDetail) => {
      initMessagePage(id, channelDetail).catch(err => console.log(err));
      setCurrentChannel(id);
    }).catch(() => {
      joinChannel(id, getChannelListInfoWithoutUpdate(id));
    });
  });

  return div1;
}

// Listen for window sign out event
document.getElementById('sign-out').addEventListener('click', () => {
  document.getElementById('login').style.display = "block";
  document.getElementById('main-structure').style.display = "none";
  document.getElementById('channel-list-body').innerHTML = '';
  document.getElementById('navbar-avatar').src = 'resource/avatar.svg';
  document.getElementById('message-part-inner-container').style.display = 'none';
  document.getElementById('message-view-body-container').innerHTML = '';
  setTokenAndUserId(undefined, undefined);
});

// Listen for add channel icon, if click, show create channel page
document.getElementById('add-channel').addEventListener('click', () => {
  createChannelBody.style.display = 'flex';
});

// Listen for create channel page create button, if click, send create channel request and add it to channel list
document.getElementById('create-channel-create-button').addEventListener('click', () => {
  // Check if channel title is empty
  if (!createChannelTitle.value) {
    createChannelTitle.classList.add('is-invalid');
    throwError('Invalid Channel Title', 'Please enter a channel title.');
    return;
  }

  // Send create channel request to backend if success, throw toast notice and add channel to channel list
  fetchWithBackEnd('/channel', 'POST', {
    'name': createChannelTitle.value,
    'private': createChannelType.value === '1',
    'description': createChannelDescription.value || ''
  }, getToken()).then(response => {
    const each = insertChannel(createChannelType.value === '1', createChannelTitle.value, response.channelId);
    channelListBody.appendChild(each);
    createChannelTitle.value = '';
    createChannelType.value = 1;
    createChannelDescription.value = '';
    createChannelBody.style.display = 'none';
  }).then(() => {
    throwToast('Create Channel Success', 'You have successfully created a channel.')
  })
    .catch(error => {
    throwError('Create Channel Error', error);
  })

  createChannelBody.style.display = 'none';
});

// Listen for create channel page cancel button, if click, clear input and hide create channel page
document.getElementById('create-channel-cancel-button').addEventListener('click', () => {
  createChannelTitle.value = '';
  createChannelType.value = 0;
  createChannelDescription.value = '';
  createChannelBody.style.display = 'none';
});

createChannelTitle.addEventListener('focus', () => {
  createChannelTitle.classList.remove('is-invalid');
});

// If user not in channel, show join channel page
const joinChannel = (id, channelDetail) => {
  document.getElementById('join-channel-page').style.display = 'flex';
  document.getElementById('join-channel-title').innerHTML = channelDetail.name;
  document.getElementById('join-channel-type').innerHTML = channelDetail.private ? 'Private' : 'Public';
  document.getElementById('join-channel-description').innerHTML = channelDetail.description || 'No description';
};

// Listen for join channel page join button, if click, send join channel request and init message page
document.getElementById('join-channel-button').addEventListener('click', () => {
  fetchWithBackEnd(`/channel/${getCurrentChannel()}/join`, 'POST', undefined, getToken())
    .then(() => {
      // If success, hide join channel page, throw toast notice and init message page
      document.getElementById('join-channel-page').style.display = 'none';
      throwToast('Join Channel Success', 'You have successfully join this channel.');
    })
    .then(() => {
      const id = getCurrentChannel();
      getChannelListInfo(id)
        .then((channelDetail) => {
        initMessagePage(id, channelDetail).catch(err => console.log(err));
        setCurrentChannel(id);
      })
        .catch(() => {
          throwError('Get Channel Info Error', 'Cannot get channel info.')
        });
    })
    .catch((error) => {
      throwError('Send Join Channel Request Error', error);
      document.getElementById('join-channel-page').style.display = 'none';
      document.getElementById('message-part-inner-container').style.display = 'none';
    });
});

// Listen for join channel page cancel button, if click, hide join channel page
document.getElementById('join-channel-cancel-button').addEventListener('click', () => {
  document.getElementById('join-channel-page').style.display = 'none';
  document.getElementById('message-part-inner-container').style.display = 'none';
});

// Listen for join channel page x close button, if click, hide join channel page
document.getElementById('x-close-join-channel').addEventListener('click', () => {
  document.getElementById('join-channel-page').style.display = 'none';
  document.getElementById('message-part-inner-container').style.display = 'none';
});

