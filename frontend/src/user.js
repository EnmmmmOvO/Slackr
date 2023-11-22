import {
  getChannelListInfo,
  getCurrentChannel,
  getToken,
  getUserId,
  getUserInfo,
  getUserInfoWithoutFetch,
  getUserList,
  requestNewUserList,
  updateChannelListInfo,
  updateUserInfo
} from "./main.js";
import {throwError} from "./error.js";
import {emailRegExp, fetchWithBackEnd, fileToDataUrl} from "./helpers.js";
import {throwToast} from "./toast.js";

const userProfilePage = document.getElementById('user-profile-page');
const userProfileName = document.getElementById('user-profile-name');
const userProfileEmail = document.getElementById('user-profile-email');
const userProfileAvatar = document.getElementById('user-profile-avatar');
const userProfileBio = document.getElementById('user-profile-bio');
const userProfileTitle = document.getElementById('user-profile-title');

const editProfilePage = document.getElementById('edit-my-profile-page');
const userPasswordShowHideButton = document.getElementById('edit-part-show-hide-button');
const editTitleList = [
  'name', 'email', 'password', 'bio'
]

// Set my profile page, an edit button more than user profile page, click edit button can change to edit my profile page
export const openMyProfile = (userId) => {
  getUserInfo(userId)
    .then(detail => {
      userProfilePage.style.display = 'flex';
      document.getElementById('user-profile-edit').style.visibility = 'visible';
      userProfileTitle.textContent = 'My Profile';

      userProfileName.innerHTML = detail.name;
      userProfileEmail.innerHTML = detail.email;
      userProfileAvatar.src = detail.avatar || 'resource/avatar.png';
      userProfileAvatar.alt = `${detail.name}'s avatar`;
      userProfileBio.innerHTML = detail.bio || 'No bio';
    })
    .catch(err => throwError('Get User Info Error', err));
}


// Set user profile page
export const openUserProfile = (userId) => {
  getUserInfo(userId)
    .then(detail => {
      userProfilePage.style.display = 'flex';
      document.getElementById('user-profile-edit').visibility = 'none';
      userProfileTitle.textContent = 'User Profile';

      userProfileName.innerHTML = detail.name;
      userProfileEmail.innerHTML = detail.email;
      userProfileAvatar.src = detail.avatar || 'resource/avatar.png';
      userProfileAvatar.alt = `${detail.name}'s avatar`;
      userProfileBio.innerHTML = detail.bio || 'No bio';
    })
    .catch(err => throwError('Get User Info Error', err));
}


// Set edit my profile page
export const openEditMyProfile = () => {
  document.getElementById('edit-profile-name-icon').style.display = 'block';
  document.getElementById('edit-profile-email-icon').style.display = 'block';
  document.getElementById('edit-profile-password-icon').style.display = 'block';
  document.getElementById('edit-profile-bio-icon').style.display = 'block';

  document.getElementById('my-profile-name').disabled = true;
  document.getElementById('my-profile-email').disabled = true;
  document.getElementById('my-profile-password').disabled = true;
  document.getElementById('my-profile-bio').disabled = true;

  document.getElementById('confirm-profile-name-icon').style.display = 'none';
  document.getElementById('confirm-profile-email-icon').style.display = 'none';
  document.getElementById('confirm-profile-password-icon').style.display = 'none';
  document.getElementById('confirm-profile-bio-icon').style.display = 'none';

  getUserInfo(getUserId())
    .then(detail => {
      editProfilePage.style.display = 'flex';

      document.getElementById('edit-avatar-show').src = detail.avatar || 'resource/avatar.png';
      document.getElementById('my-profile-name').value = detail.name;
      document.getElementById('my-profile-email').value = detail.email;
      document.getElementById('my-profile-bio').value = detail.bio || '';
    })
    .catch(err => throwError('Get User Info Error', err));
}

// Set close user profile page
document.getElementById('user-profile-close').addEventListener('click', () => {
  userProfilePage.style.display = 'none';
});

// Set close edit my profile page
document.getElementById('user-profile-x-close').addEventListener('click', () => {
  userProfilePage.style.display = 'none';
});

// Set navbar person icon click to open edit profile page
document.getElementById('navbar-my-profile-icon').addEventListener('click', () => {
  openEditMyProfile();
});

// In edit user page, click edit can edit user name, email, password and bio, click confirm can confirm edit
// Check the user title, type and description is valid, If valid, throw error
editTitleList.forEach((title) => {

  document.getElementById(`edit-profile-${title}-icon`).addEventListener('click', () => {
    document.getElementById(`my-profile-${title}`).disabled = false;
    document.getElementById(`edit-profile-${title}-icon`).style.display = 'none';
    document.getElementById(`confirm-profile-${title}-icon`).style.display = 'block';
  });

  document.getElementById(`confirm-profile-${title}-icon`).addEventListener('click', () => {
    let result = undefined
    switch (title) {
      case 'name': result = checkEditName(); break;
      case 'email': result = checkEditEmail(); break;
      case 'password': result = checkEditPassword(); break;
    }

    if (result) {
      throwError(result[0], result[1]);
      return;
    }

    document.getElementById(`my-profile-${title}`).disabled = true;
    document.getElementById(`confirm-profile-${title}-icon`).style.display = 'none';
    document.getElementById(`edit-profile-${title}-icon`).style.display = 'block';
  });
});

const checkEditName = () =>
  new RegExp('^ *$').test(document.getElementById('my-profile-name').value) ?
    ['Invalid Name', 'Name cannot start with space'] : undefined;


const checkEditEmail = () =>
  emailRegExp.test(document.getElementById('my-profile-email').value) ?
    undefined : ['Invalid Email', 'Email format is invalid'];

const checkEditPassword = () =>
  document.getElementById('my-profile-password').value === '' ?
    ['Invalid Password', 'Password cannot be empty'] : undefined;

// Set show and hide password button
userPasswordShowHideButton.addEventListener('click', () => {
  if (userPasswordShowHideButton.textContent === 'Show') {
    userPasswordShowHideButton.textContent = 'Hide';
    document.getElementById('my-profile-password').type = 'text';
  } else {
    userPasswordShowHideButton.textContent = 'Show';
    document.getElementById('my-profile-password').type = 'password';
  }
});

// Set open edit my profile page
document.getElementById('user-profile-edit').addEventListener('click', () => {
  openEditMyProfile();
  userProfilePage.style.display = 'none';
})

// Set avatar can show the changing or original avatar
document.getElementById('edit-avatar-input').addEventListener('change', () => {
  const file = document.getElementById('edit-avatar-input').files[0];
  document.getElementById('edit-avatar-show').src = file ? URL.createObjectURL(file) : 'resource/avatar.png';
});

// Set close edit my profile page
document.getElementById('edit-profile-x-close').addEventListener('click', () => {
  editProfilePage.style.display = 'none';
});

// Set cancel edit my profile page
document.getElementById('edit-profile-cancel').addEventListener('click', () => {
  editProfilePage.style.display = 'none';
});


// Check the user name, email, password and bio is valid, If valid, send to backend
document.getElementById('edit-profile-submit').addEventListener('click', async () => {
  const elements = document.querySelectorAll('.check2-square-icon');
    for (let i = 0; i < elements.length; i++) {
      if (window.getComputedStyle(elements[i]).display !== 'none') {
        throwError('Invalid Input', 'Please click confirm button change first.');
        return;
      }
    }

  const origin = getUserInfoWithoutFetch(getUserId());
  const body = {};

  const avatar = document.getElementById('edit-avatar-input').files[0];

  if (avatar) {
    await fileToDataUrl(avatar)
      .then(dataUrl => {
        if (origin.avatar !== dataUrl) body.image = dataUrl
      })
      .catch(err => {
        throwError('File to Data URL Error', err)
      })
  }

  if (document.getElementById('my-profile-name').value !== origin.name)
    body.name = document.getElementById('my-profile-name').value;

  if (document.getElementById('my-profile-email').value !== origin.email)
    body.email = document.getElementById('my-profile-email').value;

  if (document.getElementById('my-profile-bio').value !== origin.bio &&
    !(document.getElementById('my-profile-bio').value === '' && origin.bio === null))
    body.bio = document.getElementById('my-profile-bio').value;

  if (document.getElementById('my-profile-password').value !== '')
    body.password = document.getElementById('my-profile-password').value;


  if (Object.keys(body).length === 0) {
    document.getElementById('edit-profile-cancel').click();
    return;
  }

  fetchWithBackEnd(`/user`, 'PUT', body, getToken())
    .then(() => {
      updateUserInfo().catch(err => throwError('Update User Info Error', err));
      editProfilePage.style.display = 'none';
      throwToast('Update User Info Success', 'You have successfully updated your user info.')
      document.getElementById('navbar-avatar').src = body.image || origin.avatar || 'resource/avatar.png';

      // If user name or avatar change, close message page to reload name and avatar
      if (body.name || body.image) document.getElementById('exit').click();

    }).catch(err => throwError('Update User Info Error', err))

})

// Set invite user page each user info
const insertUser = (detail, id) => {
  const div1 = document.createElement('div');
  div1.className = 'form-check invite-each-container'

  const input = document.createElement('input');
  input.className = 'form-check-input input-border'
  input.type = 'checkbox';
  input.value = id;
  input.id = id;

  const label = document.createElement('label');
  label.className = 'form-check-label';
  label.for = id;
  label.innerHTML = detail.name;

  div1.appendChild(input);
  div1.appendChild(label);

  return div1;
}

// Set invite user page
document.getElementById('channel-invite').addEventListener('click', () => {
  getChannelListInfo(getCurrentChannel())
    .then(async detail => {
      const members = detail.members;
      const body = document.getElementById('invite-user-body');
      const result = {};

      await requestNewUserList().catch(err => throwError('Request New User List Error', err));
      await updateUserInfo().catch(err => throwError('Update User Info Error', err));

      const userList = getUserList();

      for (const key in userList) {
        if (members.find(item => item == key)) continue;

        result[userList[key].name] = insertUser(userList[key], key);
      }

      if (Object.keys(result).length === 0) {
        body.innerHTML = 'No user to invite';
        document.getElementById('invite-user-invite').disabled = true;
      } else {
        Object.keys(result).sort().forEach((name) => {
          body.appendChild(result[name]);
          document.getElementById('invite-user-invite').disabled = false;
        });
      }
    })
    .catch(err => throwError('Get Channel Info Error', err));
    document.getElementById('invite-page').style.display = 'flex';
});

// close invite user page
document.getElementById('invite-user-cancel').addEventListener('click', () => {
  document.getElementById('invite-page').style.display = 'none';
  document.getElementById('invite-user-body').innerHTML = '';
});

// close invite user page
document.getElementById('invite-user-x-close').addEventListener('click', () => {
  document.getElementById('invite-page').style.display = 'none';
  document.getElementById('invite-user-body').innerHTML = '';
});

// invite selected user to channel and update channel list info
document.getElementById('invite-user-invite').addEventListener('click', async () => {
  const checkboxes = document.getElementById('invite-user-body').querySelectorAll('input[type="checkbox"]:checked');
  const checkedUserIds = Array.from(checkboxes).map(checkbox => checkbox.value);

  if (checkedUserIds.length === 0) {
    throwError('Invite User Error', 'Please select at least one user to invite.');
  } else {
    checkedUserIds.forEach(userId => {
      fetchWithBackEnd(`/channel/${getCurrentChannel()}/invite`, 'POST', {
        "userId": userId
      }, getToken())
        .catch(err => throwError('Invite User Error', err));
    });
    document.getElementById('invite-user-cancel').click();
    await updateChannelListInfo().catch(err => throwError('Update Channel List Info Error', err));
    throwToast('Invite User Success', 'You have successfully invited user(s).');
  }
});