/*
 * Copyright (C) 2003-2017 eXo Platform SAS.
 *
 * This is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation; either version 2.1 of
 * the License, or (at your option) any later version.
 *
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this software; if not, write to the Free
 * Software Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301 USA, or see the FSF site: http://www.fsf.org.
 */
package org.exoplatform.webconferencing.dao;

import java.util.Calendar;
import java.util.Collections;
import java.util.List;

import javax.persistence.NoResultException;
import javax.persistence.PersistenceException;
import javax.persistence.TypedQuery;

import org.exoplatform.commons.persistence.impl.GenericDAOJPAImpl;
import org.exoplatform.webconferencing.UserInfo;
import org.exoplatform.webconferencing.domain.CallEntity;

/**
 * Created by The eXo Platform SAS.
 *
 * @author <a href="mailto:pnedonosko@exoplatform.com">Peter Nedonosko</a>
 * @version $Id: CallDAO.java 00000 Dec 22, 2017 pnedonosko $
 */
public class CallDAO extends GenericDAOJPAImpl<CallEntity, String> {

  /** The Constant USER_CALL_DAYS_LIVETIME. */
  public static final int USER_CALL_DAYS_LIVETIME = 14;

  /**
   * Instantiates a new call DAO.
   */
  public CallDAO() {
  }

  /**
   * Find group call by owner id.
   *
   * @param ownerId the owner id
   * @return the call entity or <code>null</code> if no call found
   * @throws PersistenceException the persistence exception
   */
  public CallEntity findGroupCallByOwnerId(String ownerId) throws PersistenceException {
    TypedQuery<CallEntity> query = getEntityManager().createNamedQuery("WebConfCall.findGroupCallByOwnerId", CallEntity.class)
                                                     .setParameter("ownerId", ownerId);

    try {
      return query.getSingleResult();
    } catch (NoResultException e) {
      return null;
    }
  }

  /**
   * Find user group calls.
   *
   * @param userId the user id
   * @return the list, it will be empty if no calls found
   * @throws PersistenceException the persistence exception
   */
  public List<CallEntity> findUserGroupCalls(String userId) throws PersistenceException {
    TypedQuery<CallEntity> query = getEntityManager().createNamedQuery("WebConfCall.findUserGroupCalls", CallEntity.class)
                                                     .setParameter("userId", userId);

    try {
      return query.getResultList();
    } catch (NoResultException e) {
      return Collections.emptyList();
    }
  }

  /**
   * Delete all users calls older of {@value #USER_CALL_DAYS_LIVETIME} days.
   *
   * @return the int number of actually removed calls
   */
  public int deleteAllUsersCalls() {
    Calendar expired = Calendar.getInstance();
    // Remove all user calls older of 2 weeks
    expired.set(Calendar.HOUR_OF_DAY, 0);
    expired.set(Calendar.MINUTE, 0);
    expired.set(Calendar.SECOND, 0);
    expired.set(Calendar.MILLISECOND, 0);
    expired.add(Calendar.DAY_OF_MONTH, -USER_CALL_DAYS_LIVETIME);
    return getEntityManager().createNamedQuery("WebConfCall.deleteOwnerOlderCalls")
                             .setParameter("ownerType", UserInfo.TYPE_NAME)
                             .setParameter("expiredDate", expired.getTime())
                             .executeUpdate();
  }

}
