#include <stdlib.h>
#include <poll.h>

#include "curl/multi.h"
#include "curl/curl.h"

#include "types.h"
#include "request.h"
#include "util.h"
#include "context.h"

#define MINICORO_IMPL
#include "minicoro.h"

struct SessionInfo* running_session;

struct SessionInfo* session_create(int need_fiber) {
  struct SessionInfo *session = malloc(sizeof(struct SessionInfo));
  session->multi_handle = curl_multi_init();
  session->request_active = 0;
  session->need_fiber = need_fiber;
  session->fiber_running = 0;
  session->fiber = NULL;
  return session;
}

void session_thread(struct SessionInfo *session) {
  CURLMcode mc;
  session->request_active = 0;
  mc = curl_multi_perform(session->multi_handle, &session->request_active);

  int msgq = 0;
  struct CURLMsg *curl_msg;
  curl_msg = curl_multi_info_read(session->multi_handle, &msgq);
  if (curl_msg && curl_msg->msg == CURLMSG_DONE) {
    finish_request(curl_msg);
  }

  //suspend the coroutine if there are no requests active
  if (session->need_fiber && !session->request_active) {
    mco_yield(mco_running());
  }
}

void session_thread_wrapper(mco_coro* fiber) {
  //infinitely loop here so we don't need to keep remaking the coroutine
  while (1) {
    session_thread(fiber->user_data);
  }
}

void session_perform(struct SessionInfo *session) {
  running_session = session;
  if (!session->need_fiber) {
    session_thread(session);
    return;
  }

  //create a new coroutine if there isn't one running already
  mco_coro* fiber;
  if (!session->fiber_running) {
    mco_desc desc = mco_desc_init(session_thread_wrapper, 0);
    desc.user_data = session;
    mco_result res = mco_create(&fiber, &desc);
  }
  else {
    fiber = session->fiber;
  }
  
  if (mco_status(fiber) == MCO_SUSPENDED) {
    printf("fiber suspended \n");
  }
  if (mco_status(fiber) == MCO_DEAD) {
    printf("fiber dead \n");
  }
  if (mco_status(fiber) == MCO_NORMAL) {
    printf("fiber normal \n");
  }

  //swich contexts into coroutine
  session->fiber_running = 1;
  mco_resume(fiber);
}


//wrap the poll function
//we want to switch contexts when curl is polling the socket
extern int __real_poll(struct pollfd *fds, nfds_t nfds, int timeout);
int __wrap_poll(struct pollfd *fds, nfds_t nfds, int timeout) {
  int ret = __real_poll(fds, nfds, timeout);

  //don't switch contexts if there is activity on the socket
  if (!running_session->need_fiber || ret != 0) {
    return ret;
  }

  //perform the context switch if there is nothing on the socket
  mco_yield(mco_running());
  return ret;
}

void session_set_options(struct SessionInfo *session, int connections_limit, int cache_limit) {
  curl_multi_setopt(session->multi_handle, CURLMOPT_MAX_TOTAL_CONNECTIONS, connections_limit);
  curl_multi_setopt(session->multi_handle, CURLMOPT_MAXCONNECTS, cache_limit);
}

void session_add_request(struct SessionInfo *session, CURL* http_handle) {
  curl_multi_add_handle(session->multi_handle, http_handle);
}

int session_get_active(struct SessionInfo *session) {
  return session->request_active;
}

void session_remove_request(struct SessionInfo *session, CURL* http_handle) {
  struct RequestInfo *request_info = get_request_info(http_handle);
  curl_multi_remove_handle(session->multi_handle, http_handle);
  curl_easy_cleanup(http_handle);
  free(request_info);
}

void session_cleanup(struct SessionInfo *session) {
  curl_multi_cleanup(session->multi_handle);

  if (session->fiber != NULL) 
    mco_destroy(session->fiber);

  free(session);
}